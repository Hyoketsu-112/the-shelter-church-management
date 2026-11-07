import { withSupabase } from "npm:@supabase/server@1";

const resendApiKey = Deno.env.get("RESEND_API_KEY");
const fromEmail = Deno.env.get("NOTIFICATION_FROM_EMAIL");

export default {
  fetch: withSupabase({ auth: "secret" }, async (_request, { supabaseAdmin }) => {
    const { data: automation, error: automationError } = await supabaseAdmin.rpc(
      "run_notification_automation",
    );

    if (automationError) {
      console.error("Notification automation failed:", automationError.message);
      return Response.json({ error: "Notification automation failed." }, { status: 500 });
    }

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("notification_settings")
      .select("church_id,channels");
    if (settingsError) {
      console.error("Could not load notification channels:", settingsError.message);
      return Response.json({ error: "Could not load notification channels." }, { status: 500 });
    }

    const emailChurches = new Set(
      (settings ?? [])
        .filter((setting) => setting.channels?.includes("email"))
        .map((setting) => setting.church_id),
    );

    if (!emailChurches.size) {
      return Response.json({ ok: true, automation, email: { sent: 0, skipped: 0 } });
    }

    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: notifications, error: notificationsError } = await supabaseAdmin
      .from("user_notifications")
      .select("id,church_id,recipient_id,title,message,created_at")
      .in("church_id", [...emailChurches])
      .gte("created_at", since)
      .order("created_at", { ascending: true });
    if (notificationsError) {
      console.error("Could not load email notifications:", notificationsError.message);
      return Response.json({ error: "Could not load email notifications." }, { status: 500 });
    }

    if (!notifications?.length) {
      return Response.json({ ok: true, automation, email: { sent: 0, skipped: 0 } });
    }

    const recipientIds = [...new Set(notifications.map((item) => item.recipient_id))];
    const { data: recipients, error: recipientsError } = await supabaseAdmin
      .from("profiles")
      .select("id,full_name")
      .in("id", recipientIds)
      .eq("is_active", true);
    if (recipientsError) {
      console.error("Could not load notification recipients:", recipientsError.message);
      return Response.json({ error: "Could not load notification recipients." }, { status: 500 });
    }

    const recipientById = new Map((recipients ?? []).map((person) => [person.id, person]));
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const notification of notifications) {
      const recipient = recipientById.get(notification.recipient_id);
      if (!recipient) {
        skipped++;
        continue;
      }
      const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(recipient.id);
      const email = authUser?.user?.email;
      if (authUserError || !email) {
        skipped++;
        continue;
      }

      const { data: existingLog } = await supabaseAdmin
        .from("notification_log")
        .select("id,status")
        .eq("notification_id", notification.id)
        .eq("recipient_id", recipient.id)
        .eq("channel", "email")
        .maybeSingle();
      if (existingLog?.status === "sent") {
        skipped++;
        continue;
      }

      const logRow = {
        church_id: notification.church_id,
        notification_id: notification.id,
        recipient_id: recipient.id,
        channel: "email",
        recipient: email,
        status: "pending",
        error: null,
      };
      const { error: logError } = await supabaseAdmin
        .from("notification_log")
        .upsert(logRow, { onConflict: "notification_id,recipient_id,channel" });
      if (logError) {
        console.error("Could not reserve email delivery:", logError.message);
        failed++;
        continue;
      }

      if (!resendApiKey || !fromEmail) {
        await supabaseAdmin.from("notification_log").update({
          status: "failed",
          error: "Configure RESEND_API_KEY and NOTIFICATION_FROM_EMAIL to enable email delivery.",
        }).eq("notification_id", notification.id).eq("recipient_id", recipient.id).eq("channel", "email");
        failed++;
        continue;
      }

      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [email],
            subject: notification.title,
            text: `${notification.message}\n\nOpen your Junior Church dashboard to respond.`,
          }),
        });
        if (!response.ok) throw new Error(`Resend returned HTTP ${response.status}`);

        await supabaseAdmin.from("notification_log").update({
          status: "sent",
          error: null,
          sent_at: new Date().toISOString(),
        }).eq("notification_id", notification.id).eq("recipient_id", recipient.id).eq("channel", "email");
        sent++;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Email delivery failed.";
        await supabaseAdmin.from("notification_log").update({ status: "failed", error: message })
          .eq("notification_id", notification.id).eq("recipient_id", recipient.id).eq("channel", "email");
        failed++;
      }
    }

    return Response.json({
      ok: failed === 0,
      automation,
      email: { sent, skipped, failed, configured: Boolean(resendApiKey && fromEmail) },
    }, { status: failed ? 207 : 200 });
  }),
};
