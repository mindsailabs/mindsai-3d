import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { smoothFade } from '../lib/copy'
import { useAppStore } from '../lib/store'

/**
 * Act 5 — "Start a Project" — scroll 0.861 → 1.00
 *
 * The M returns to centre on a reflective pedestal (see MonumentFloor.tsx).
 * A simple, spec-minimal contact form sits alongside. Submit triggers a
 * success state; real Vercel serverless email hook lands in launch prep.
 */

const contactSchema = z.object({
  name: z.string().min(2, 'Please enter your name'),
  email: z.string().email('Please enter a valid email'),
  brief: z.string().min(10, 'A couple of sentences helps'),
  budget: z.enum(['5-15', '15-50', '50+', 'not-sure'], {
    required_error: 'Please pick a bracket',
  }),
})

type ContactValues = z.infer<typeof contactSchema>

export function Act5Contact() {
  const progress = useAppStore((s) => s.scrollProgress)
  const opacity = smoothFade(progress, 0.83, 0.89, 0.99, 1.01)
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
  })

  const onSubmit = async (data: ContactValues) => {
    // Placeholder submission — echoes to console until a Vercel serverless
    // email function is wired in launch prep. Form values are valid here.
    console.log('[Mindsai] Contact submission', data)
    await new Promise((r) => setTimeout(r, 800))
    setSubmitted(true)
  }

  if (opacity <= 0.001) return null

  return (
    <div
      className="fixed inset-0 z-20 pointer-events-none overflow-y-auto"
      style={{ opacity }}
      aria-hidden={opacity < 0.5}
    >
      {/* Bottom reserved for footer (~18vh). Top reserved for nav (~12vh).
          Form lives in the remaining 70vh — vertically centered, right-aligned. */}
      <div className="absolute top-[12vh] bottom-[18vh] left-0 right-0 flex items-center justify-end px-6 md:px-12 lg:px-20">
        <div className="w-full max-w-[520px] pointer-events-auto">
          <div
            className="text-[10px] md:text-[11px] uppercase tracking-[0.4em] text-brand-teal font-medium"
            style={{
              transform: `translateY(${(1 - opacity) * -14}px)`,
              transition: 'transform 700ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          >
            Start a project
          </div>
          <h2
            className="mt-3 text-text-primary font-black leading-[0.85] tracking-tightest text-[clamp(2rem,4.2vw,4.25rem)]"
            style={{
              transform: `translateY(${(1 - opacity) * -26}px)`,
              transition: 'transform 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          >
            The quiet conversation.
          </h2>
          <p className="mt-2 text-text-secondary text-[12px] md:text-[13px] leading-relaxed max-w-[420px]">
            Briefs we take on are small in number and specific. Tell us what you want
            built — we'll reply within 24 hours.
          </p>

          {submitted ? (
            <div className="mt-6 border border-brand-teal/30 bg-brand-teal/5 rounded-sm px-5 py-6">
              <div className="text-brand-teal text-[10px] uppercase tracking-[0.3em] font-medium">
                Received
              </div>
              <div className="mt-2 text-text-primary text-[15px] leading-relaxed">
                Thanks — we'll reply within 24 hours to the email you provided.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4">
              <FormField label="Name" error={errors.name?.message}>
                <input
                  {...register('name')}
                  className="field"
                  placeholder="Your name"
                  autoComplete="name"
                />
              </FormField>

              <FormField label="Email" error={errors.email?.message}>
                <input
                  {...register('email')}
                  type="email"
                  className="field"
                  placeholder="you@company.com"
                  autoComplete="email"
                />
              </FormField>

              <FormField label="What you need" error={errors.brief?.message}>
                <textarea
                  {...register('brief')}
                  className="field min-h-[80px] resize-y"
                  placeholder="A few sentences on the goal, timeline, and context."
                />
              </FormField>

              <FormField label="Budget bracket (GBP)" error={errors.budget?.message}>
                <select {...register('budget')} className="field appearance-none cursor-pointer">
                  <option value="">Select a bracket</option>
                  <option value="5-15">£5k – £15k</option>
                  <option value="15-50">£15k – £50k</option>
                  <option value="50+">£50k+</option>
                  <option value="not-sure">Not sure yet</option>
                </select>
              </FormField>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group mt-2 relative overflow-hidden border border-brand-teal/40 hover:border-brand-teal bg-transparent hover:bg-brand-teal/10 text-text-primary font-medium text-[13px] uppercase tracking-[0.2em] px-8 py-4 rounded-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="relative z-10">{isSubmitting ? 'Sending…' : 'Send'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

interface FormFieldProps {
  label: string
  error?: string
  children: React.ReactNode
}

function FormField({ label, error, children }: FormFieldProps) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[9px] uppercase tracking-[0.3em] text-text-secondary font-medium">
        {label}
      </span>
      {children}
      {error && <span className="text-[11px] text-brand-teal/80">{error}</span>}
    </label>
  )
}
