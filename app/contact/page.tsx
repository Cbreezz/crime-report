"use client";

export default function Contact() {
  return (
    <div className="relative min-h-screen bg-black selection:bg-sky-500/20 overflow-hidden">
      {/* Gradient Background */}
      <div className="fixed inset-0 -z-10 min-h-screen">
        <div className="absolute inset-0 h-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.03),transparent_50%)]" />
        <div className="absolute inset-0 h-full bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.04),transparent_70%)]" />
      </div>

      <main className="relative px-6 pt-32">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-col items-center text-center">
            <h1 className="mt-8 bg-gradient-to-b from-white to-white/80 bg-clip-text text-5xl font-bold tracking-tight text-transparent">
              Contact Us
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400">
              Get in touch with our support team or law enforcement partners.
              We're here to help keep your community safe.
            </p>
          </div>

          <div className="mt-16 bg-zinc-900/50 rounded-2xl border border-white/5 p-6">
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Emergency Hotline</h3>
                <p className="text-zinc-400 mb-2">For immediate assistance:</p>
                <p className="text-sky-400 font-mono">911</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Support Email</h3>
                <p className="text-zinc-400 mb-2">General inquiries and support:</p>
                <p className="text-sky-400 font-mono">support@crime-report-app.com</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Law Enforcement</h3>
                <p className="text-zinc-400 mb-2">Direct line for verified reports:</p>
                <p className="text-sky-400 font-mono">(555) 123-4567</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Office Hours</h3>
                <p className="text-zinc-400">
                  Monday - Friday: 9:00 AM - 6:00 PM EST<br />
                  Emergency support available 24/7
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
