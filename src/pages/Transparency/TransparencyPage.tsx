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
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
