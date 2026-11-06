"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Users, CalendarDays, QrCode, MapPin, Church } from "lucide-react";

const locations = ["The Shelter Anthony", "The Shelter Okota", "The Shelter Community"];

const features = [
  [Users, "People & family records", "Organise child profiles, guardians and ministry information in one protected workspace."],
  [CalendarDays, "Birthdays & follow-up", "Keep important dates visible and help ministry teams care for every family."],
  [ShieldCheck, "Role-based access", "Super Admins, leaders and teachers see the tools appropriate to their role."],
  [QrCode, "QR registration", "Make first-time visitor and church registration simple on any phone."],
  [MapPin, "Three connected locations", "Support Anthony, Okota and Community from one connected network."],
] as const;

export default function WelcomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fbfaf8] text-[#202b26]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/welcome" className="flex items-center gap-3">
          <Image src="/junior-church-logo.jpg" alt="The Shelter Junior Church" width={52} height={52} className="h-12 w-12 rounded-full object-contain" priority />
          <div className="leading-tight">
            <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#718078]">The Shelter</p>
            <p className="text-sm font-black">Church Management</p>
          </div>
        </Link>
        <nav className="hidden gap-7 text-sm font-semibold text-[#647069] md:flex">
          <a href="#workspaces">Workspaces</a><a href="#locations">Locations</a><a href="#features">Features</a>
        </nav>
        <Link href="/login" className="rounded-full bg-[#b65d35] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#b65d35]/20 transition hover:bg-[#994a29]">Staff sign in</Link>
      </header>

      <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:px-12 lg:pb-28 lg:pt-20">
        <div className="absolute -left-48 top-0 h-96 w-96 rounded-full bg-[#e8efe7] blur-3xl" />
        <div className="absolute right-0 top-0 h-[28rem] w-[28rem] rounded-full bg-[#f5e8de] blur-3xl" />
        <div className="relative z-10">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#e8dfd6] bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[.16em] text-[#a15837]"><span className="h-2 w-2 rounded-full bg-[#b65d35]" /> One connected church network</div>
          <h1 className="max-w-3xl text-5xl font-black leading-[1.03] tracking-[-.055em] sm:text-6xl lg:text-7xl">Care for people.<br /><span className="text-[#b65d35]">Clarity for every</span><br />church community.</h1>
          <p className="mt-7 max-w-xl text-base leading-8 text-[#68736c] sm:text-lg">A shared digital home for The Shelter network—bringing Junior Church records, ministry teams and church operations into a more organised and thoughtful experience.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="inline-flex items-center justify-center gap-3 rounded-full bg-[#202c27] px-7 py-4 text-sm font-bold text-white transition hover:bg-[#35483e]">Access the platform <ArrowRight size={17} /></Link>
            <a href="#workspaces" className="inline-flex items-center justify-center rounded-full border border-[#dedbd4] bg-white px-7 py-4 text-sm font-bold">Explore workspaces</a>
          </div>
          <div className="mt-11 flex flex-wrap gap-x-7 gap-y-3 border-t border-[#e8e4dd] pt-6 text-xs font-semibold text-[#748078]"><span className="flex items-center gap-2"><ShieldCheck size={16} /> Access-controlled</span><span className="flex items-center gap-2"><MapPin size={16} /> Three locations</span><span className="flex items-center gap-2"><Users size={16} /> People-first ministry</span></div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[520px]">
          <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-[#e7eee7] via-[#f7eee6] to-[#e8e2d8] blur-sm" />
          <div className="relative rounded-[2rem] border border-white bg-white p-6 shadow-[0_35px_90px_-45px_rgba(30,45,37,.45)]">
            <div className="flex items-center justify-between border-b border-[#eeece7] pb-5"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#8b958d]">Network overview</p><h2 className="mt-1 text-xl font-black">Church locations</h2></div><span className="rounded-full bg-[#edf3ec] px-3 py-1.5 text-[10px] font-bold text-[#58725e]">3 locations</span></div>
            <div className="grid gap-3 py-5 sm:grid-cols-2"><div className="rounded-2xl bg-[#f6f3ed] p-4"><Users className="text-[#b65d35]" size={22} /><p className="mt-5 text-2xl font-black">Junior</p><p className="mt-1 text-xs leading-5 text-[#748078]">Children, guardians, classes and birthdays</p></div><div className="rounded-2xl bg-[#eef3ee] p-4"><Church className="text-[#58725e]" size={22} /><p className="mt-5 text-2xl font-black">Main</p><p className="mt-1 text-xs leading-5 text-[#748078]">A dedicated space for the wider church</p></div></div>
            <div className="space-y-2 rounded-2xl border border-[#eeece7] p-4">{locations.map((location, index) => <div key={location} className="flex items-center gap-3 rounded-xl bg-[#faf9f6] px-3 py-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f3e6de] text-xs font-black text-[#a15837]">0{index + 1}</span><span className="flex-1 text-sm font-semibold">{location}</span><span className="h-2 w-2 rounded-full bg-[#7c9b81]" /></div>)}</div>
          </div>
        </div>
      </section>

      <section id="workspaces" className="bg-[#202c27] px-5 py-20 text-white sm:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl lg:px-4"><p className="text-xs font-bold uppercase tracking-[.22em] text-[#d6a083]">One dedicated workspace</p><h2 className="mt-4 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">One focused workspace for every child and family.</h2>
          <div className="mt-12 max-w-3xl">
            <article className="rounded-[1.7rem] bg-[#f7f4ee] p-7 text-[#26332b] sm:p-9">
              <div className="flex items-center justify-between"><Image src="/junior-church-logo.jpg" alt="The Shelter Junior Church" width={70} height={70} className="h-16 w-16 rounded-2xl bg-white object-contain p-1" /><span className="rounded-full bg-[#e7eee6] px-3 py-1.5 text-[10px] font-bold uppercase text-[#58725e]">Junior Church</span></div>
              <h3 className="mt-8 text-2xl font-black">Every child known. Every family cared for.</h3>
              <p className="mt-3 text-sm leading-7 text-[#707970]">Manage child profiles, guardian details, classes, birthdays, attendance and ministry follow-up from one secure workspace.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="locations" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-12"><p className="text-xs font-bold uppercase tracking-[.22em] text-[#b65d35]">Connected locations</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">Supporting every church location with consistency.</h2><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{locations.map((location, index) => <div key={location} className="rounded-2xl border border-[#e8e4dd] bg-white p-5 transition hover:-translate-y-1 hover:shadow-xl"><div className="flex justify-between"><span className="text-xs font-black text-[#b65d35]">0{index + 1}</span><MapPin size={16} className="text-[#9ba39c]" /></div><h3 className="mt-8 text-lg font-extrabold">{location}</h3><p className="mt-2 text-xs text-[#7d877f]">Junior Church management</p></div>)}</div></section>

      <section id="features" className="bg-[#f1eee7] px-5 py-20 sm:px-8"><div className="mx-auto max-w-7xl"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[.22em] text-[#b65d35]">Thoughtful tools</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">Less time chasing information. More time caring for people.</h2></div><div className="mt-12 grid gap-4 md:grid-cols-3">{features.map(([Icon, title, body]) => <article key={title} className="rounded-2xl bg-white p-6 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f5e9e1] text-[#aa5934]"><Icon size={20} /></div><h3 className="mt-5 font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#748078]">{body}</p></article>)}</div></div></section>

      <section className="px-5 py-20 sm:px-8"><div className="mx-auto max-w-6xl rounded-[2rem] bg-[#b65d35] px-7 py-14 text-center text-white shadow-2xl shadow-[#b65d35]/20"><p className="text-xs font-bold uppercase tracking-[.22em] text-white/70">Our church network</p><h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black sm:text-5xl">One connected place to serve with care and confidence.</h2><Link href="/login" className="mt-8 inline-flex items-center gap-3 rounded-full bg-white px-7 py-4 text-sm font-extrabold text-[#8f482b]">Continue to staff sign in <ArrowRight size={17} /></Link></div></section>

      <footer className="border-t border-[#e8e4dd] bg-white px-5 py-8 text-center text-xs text-[#8c958e]">THE SHELTER · Church Management System · A place of refuge and strength.</footer>
    </main>
  );
}
