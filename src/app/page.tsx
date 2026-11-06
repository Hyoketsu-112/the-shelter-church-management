"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Users, CalendarDays, QrCode, MapPin } from "lucide-react";

const locations = ["The Shelter Anthony", "The Shelter Okota", "The Shelter Community"];
const features = [
  [Users, "Children & family records", "Keep child profiles, guardians and important ministry information organised in one secure place."],
  [CalendarDays, "Birthdays & follow-up", "Keep important dates visible and help ministry teams care for every child and family."],
  [ShieldCheck, "Role-based access", "Super Admins, leaders and teachers see only the tools and records appropriate to their role."],
  [QrCode, "QR registration", "Make Junior Church first-time registration simple from any phone."],
] as const;

export default function HomePage() {
  return <main className="min-h-screen overflow-hidden bg-[#fbfaf8] text-[#202b26]">
    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
      <Link href="/" className="flex items-center gap-3"><Image src="/junior-church-logo.jpg" alt="The Shelter Junior Church" width={56} height={56} className="h-12 w-12 rounded-full object-contain" priority /><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#718078]">The Shelter</p><p className="text-sm font-black">Junior Church Management</p></div></Link>
      <nav className="hidden gap-7 text-sm font-semibold text-[#647069] md:flex"><a href="#locations">Locations</a><a href="#features">Features</a></nav>
      <Link href="/login" className="rounded-full bg-[#b65d35] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#b65d35]/20">Staff sign in</Link>
    </header>

    <section className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.1fr_.9fr] lg:px-12 lg:pb-28 lg:pt-20">
      <div className="absolute -left-48 top-0 h-96 w-96 rounded-full bg-[#e8efe7] blur-3xl" /><div className="absolute right-0 top-0 h-[28rem] w-[28rem] rounded-full bg-[#f5e8de] blur-3xl" />
      <div className="relative z-10"><div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#e8dfd6] bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[.16em] text-[#a15837]"><span className="h-2 w-2 rounded-full bg-[#b65d35]" /> Junior Church management</div>
        <h1 className="max-w-3xl text-5xl font-black leading-[1.03] tracking-[-.055em] sm:text-6xl lg:text-7xl">Every child known.<br /><span className="text-[#b65d35]">Every family</span><br />cared for.</h1>
        <p className="mt-7 max-w-xl text-base leading-8 text-[#68736c] sm:text-lg">A secure digital home for The Shelter Junior Church—bringing children, families, classes, attendance and ministry follow-up into one organised experience.</p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/login" className="inline-flex items-center justify-center gap-3 rounded-full bg-[#202c27] px-7 py-4 text-sm font-bold text-white">Access the platform <ArrowRight size={17} /></Link><a href="#locations" className="inline-flex items-center justify-center rounded-full border border-[#dedbd4] bg-white px-7 py-4 text-sm font-bold">View locations</a></div>
      </div>
      <div className="relative z-10 mx-auto w-full max-w-[500px]"><div className="rounded-[2rem] border border-white bg-white p-6 shadow-[0_35px_90px_-45px_rgba(30,45,37,.45)]"><div className="flex items-center gap-4 border-b border-[#eeece7] pb-5"><Image src="/junior-church-logo.jpg" alt="" width={72} height={72} className="h-16 w-16 rounded-2xl bg-[#f6f3ed] object-contain p-1"/><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#8b958d]">The Shelter</p><h2 className="text-xl font-black">Junior Church</h2><p className="text-xs text-[#748078]">Three connected locations</p></div></div><div className="space-y-3 py-5">{locations.map((location,index)=><div key={location} className="flex items-center gap-3 rounded-xl bg-[#faf9f6] px-4 py-4"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f3e6de] text-xs font-black text-[#a15837]">0{index+1}</span><span className="flex-1 text-sm font-semibold">{location}</span><MapPin size={16} className="text-[#9ba39c]"/></div>)}</div><div className="rounded-2xl bg-[#eef3ee] p-4"><p className="font-bold">One focused workspace</p><p className="mt-1 text-xs leading-5 text-[#748078]">Children, guardians, classes, birthdays, attendance and follow-up.</p></div></div></div>
    </section>

    <section id="locations" className="bg-[#202c27] px-5 py-20 text-white sm:px-8"><div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase tracking-[.22em] text-[#d6a083]">Our locations</p><h2 className="mt-4 max-w-3xl text-3xl font-black sm:text-5xl">One Junior Church system across three communities.</h2><div className="mt-10 grid gap-4 md:grid-cols-3">{locations.map((location,index)=><article key={location} className="rounded-2xl bg-white/10 p-6"><span className="text-xs font-black text-[#d6a083]">0{index+1}</span><h3 className="mt-8 text-xl font-black">{location}</h3><p className="mt-2 text-sm text-white/65">Connected Junior Church records and ministry tools.</p></article>)}</div></div></section>

    <section id="features" className="bg-[#f1eee7] px-5 py-20 sm:px-8"><div className="mx-auto max-w-7xl"><div className="mx-auto max-w-2xl text-center"><p className="text-xs font-bold uppercase tracking-[.22em] text-[#b65d35]">Thoughtful tools</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">Less time chasing information. More time caring for children.</h2></div><div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">{features.map(([Icon,title,body])=><article key={title} className="rounded-2xl bg-white p-6 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f5e9e1] text-[#aa5934]"><Icon size={20}/></div><h3 className="mt-5 font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#748078]">{body}</p></article>)}</div></div></section>

    <section className="px-5 py-20 sm:px-8"><div className="mx-auto max-w-6xl rounded-[2rem] bg-[#b65d35] px-7 py-14 text-center text-white"><p className="text-xs font-bold uppercase tracking-[.22em] text-white/70">The Shelter Junior Church</p><h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black sm:text-5xl">A better way to care for every child and family.</h2><Link href="/login" className="mt-8 inline-flex items-center gap-3 rounded-full bg-white px-7 py-4 text-sm font-extrabold text-[#8f482b]">Continue to staff sign in <ArrowRight size={17}/></Link></div></section>
    <footer className="border-t border-[#e8e4dd] bg-white px-5 py-8 text-center text-xs text-[#8c958e]">THE SHELTER · Junior Church Management System</footer>
  </main>;
}
