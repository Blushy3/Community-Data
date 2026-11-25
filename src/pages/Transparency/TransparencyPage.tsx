import { PageHeader } from '@/components/ui/PageHeader'

/**
 * AI transparency statement (README §12).
 */
export function TransparencyPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Transparency"
        title="Built with AI. Guided by people."
        description="How artificial intelligence is used in this project - stated openly."
      />

      <div className="page-container py-8">
        <div className="max-w-3xl space-y-6 text-sm text-ink-2">
          <section>
            <h2 className="text-base">What AI is used for</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-3">
              <li>Programming and code review.</li>
              <li>User interface development.</li>
              <li>Problem solving and debugging.</li>
              <li>Technical analysis and documentation.</li>
              <li>Preparation of content drafts.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base">Security and responsibility</h2>
            <p className="mt-2 text-ink-3">
              All community data is stored securely and protected by the Community Data
              security layer, our own system designed and maintained for this project. We
              do not describe how it works: publishing the details of a protection only
              makes it easier for someone to try to get around it.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-3">
              <li>Data is protected both while it is stored and while it travels.</li>
              <li>Passwords are never kept by the application itself.</li>
              <li>
                Access codes are kept only in a protected form that cannot be turned back
                into the original code.
              </li>
              <li>
                Sensitive actions are checked by the system before they are allowed, so
                hiding something in the interface is never what protects it.
              </li>
            </ul>
            <p className="mt-2 text-ink-3">
              A human is responsible for all security and for managing it: what is
              enabled, who receives access and how the security layer evolves. AI helps
              with the implementation, but makes none of these decisions and carries no
              responsibility for them.
            </p>
          </section>

          <section>
            <h2 className="text-base">Privacy</h2>
            <p className="mt-2 text-ink-3">
              Community Data is built on one rule: collect as little as possible and keep
              it that way. Registration never asks for an email address or a phone number,
              and no Discord account is linked.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-3">
              <li>No analytics, no tracking scripts, no advertising pixels.</li>
              <li>
                No third-party cookies and no profiling. The only token stored is your own
                session, kept in your browser.
              </li>
              <li>Your data is never sold, rented or shared with advertisers.</li>
              <li>
                Only what you choose to publish is public: profile fields, achievements and
                profile images.
              </li>
              <li>
                The portal runs on Supabase (database, authentication, storage) and GitHub
                Pages (static hosting). These providers process data only to keep the site
                running and are bound by their own security policies.
              </li>
            </ul>
            <p className="mt-2 text-ink-3">
              Everything you publish can be changed at any time in your account settings.
              An administrator can also delete an account on request, which removes its
              profile, awards and images.
            </p>
          </section>

          <section>
            <h2 className="text-base">What AI is not responsible for</h2>
            <p className="mt-2 text-ink-3">
              Direction, requirements and final decisions are made by people. AI is a
              tool used during development - not a member of the administration and not
              an author of community rules or moderation decisions.
            </p>
          </section>

          <section>
            <h2 className="text-base">Future uses</h2>
            <p className="mt-2 text-ink-3">
              If AI is later used for additional functionality (for example automated
              content features), those specific uses will be described here separately.
              Changes to the security layer, and anything that would affect what data is
              collected, will be documented here as well.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
