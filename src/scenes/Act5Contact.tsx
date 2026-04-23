import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { smoothFade } from '../lib/copy'
import { useAppStore } from '../lib/store'

/**
 * Act 5 — "Start a Project" — scroll 0.861 → 1.00
 *
 * v2 — FLOATING INTERACTIVE SURVEY.
 *
 * Replaces the old all-fields-at-once form (which was fiddly and low-contrast)
 * with a step-by-step "survey" experience:
 *   – Four questions, one visible at a time.
 *   – Large typographic question + single input field.
 *   – Progress indicator (four nodes, filled as answered).
 *   – Continue button advances / Enter advances. Back available after step 0.
 *   – Cross-fade transition between steps — no jarring swap.
 *
 * Visually: a floating glass panel (backdrop-blur-2xl + teal edge glow),
 * vertically centred, right-aligned on desktop to leave the M-monument its
 * pedestal. On mobile it stacks full-width below the M.
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

type StepField = 'name' | 'email' | 'brief' | 'budget'

interface Step {
  field: StepField
  label: string // eyebrow text (e.g. "01 — Your name")
  question: string // big display text
  placeholder?: string
  kind: 'text' | 'email' | 'textarea' | 'choice'
  choices?: { value: string; label: string; hint?: string }[]
}

const STEPS: Step[] = [
  {
    field: 'name',
    label: 'What should we call you',
    question: 'Your name.',
    placeholder: 'Type your name',
    kind: 'text',
  },
  {
    field: 'email',
    label: 'Where should we reply',
    question: 'Your email.',
    placeholder: 'you@company.com',
    kind: 'email',
  },
  {
    field: 'brief',
    label: 'What you need',
    question: 'What are you trying to build?',
    placeholder: 'A sentence or two on the goal, timeline, context',
    kind: 'textarea',
  },
  {
    field: 'budget',
    label: 'Budget bracket',
    question: 'What’s the bracket?',
    kind: 'choice',
    choices: [
      { value: '5-15', label: '£5k – £15k', hint: 'A focused sprint' },
      { value: '15-50', label: '£15k – £50k', hint: 'A multi-channel build' },
      { value: '50+', label: '£50k +', hint: 'A long-form partnership' },
      { value: 'not-sure', label: 'Not sure yet', hint: 'Open to guidance' },
    ],
  },
]

export function Act5Contact() {
  const progress = useAppStore((s) => s.scrollProgress)
  const opacity = smoothFade(progress, 0.83, 0.89, 0.99, 1.01)
  const [submitted, setSubmitted] = useState(false)
  const [stepIdx, setStepIdx] = useState(0)

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({
    resolver: zodResolver(contactSchema),
    mode: 'onChange',
  })

  const onSubmit = async (data: ContactValues) => {
    console.log('[Mindsai] Contact submission', data)
    await new Promise((r) => setTimeout(r, 600))
    setSubmitted(true)
  }

  // Advance to next step if the current step's field validates, otherwise
  // surface the field-level error (react-hook-form triggers the resolver).
  const advance = async () => {
    const field = STEPS[stepIdx].field
    const ok = await trigger(field)
    if (!ok) return
    if (stepIdx < STEPS.length - 1) {
      setStepIdx((i) => i + 1)
    } else {
      // Last step — submit. handleSubmit validates the whole schema again.
      handleSubmit(onSubmit)()
    }
  }

  const goBack = () => setStepIdx((i) => Math.max(0, i - 1))

  // Auto-focus the input of the current step when it mounts / changes.
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  useEffect(() => {
    if (inputRef.current && !submitted) {
      // Tiny delay to let the cross-fade start so focus outline isn't jarring.
      const id = setTimeout(() => inputRef.current?.focus(), 150)
      return () => clearTimeout(id)
    }
  }, [stepIdx, submitted])

  // Pressing Enter in any step advances (except in the textarea, where Enter
  // inserts a newline — Cmd/Ctrl+Enter advances).
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isTextarea = STEPS[stepIdx].kind === 'textarea'
    if (e.key === 'Enter') {
      if (!isTextarea || e.metaKey || e.ctrlKey) {
        e.preventDefault()
        advance()
      }
    }
  }

  if (opacity <= 0.001) return null

  const currentStep = STEPS[stepIdx]
  const currentValue = watch(currentStep.field)

  return (
    <div
      className="fixed inset-0 z-20 pointer-events-none overflow-y-auto"
      style={{ opacity }}
      aria-hidden={opacity < 0.5}
    >
      <div className="absolute inset-x-0 top-[9vh] md:top-[12vh] bottom-[4vh] md:bottom-[14vh] flex items-center justify-center md:justify-end px-4 md:px-10 lg:px-16">
        <div className="w-full max-w-[560px] pointer-events-auto">
          {/* FLOATING GLASS CARD */}
          <div
            className="relative rounded-[4px] border border-white/10 p-5 md:p-8 lg:p-10"
            style={{
              background: 'rgba(8, 12, 16, 0.55)',
              backdropFilter: 'blur(22px) saturate(130%)',
              WebkitBackdropFilter: 'blur(22px) saturate(130%)',
              boxShadow:
                '0 40px 80px -30px rgba(0, 0, 0, 0.9),' +
                '0 0 0 1px rgba(115, 197, 204, 0.08) inset,' +
                '0 0 80px -20px rgba(115, 197, 204, 0.22)',
              willChange: 'transform, opacity',
            }}
          >
            {/* TOP BAR — label + progress */}
            <div className="flex items-center justify-between mb-6 md:mb-10">
              <div className="text-brand-teal text-[10px] uppercase tracking-[0.3em] md:tracking-[0.35em] font-medium">
                Start a project
              </div>
              {!submitted && (
                <div className="text-text-secondary text-[10px] uppercase tracking-[0.25em] tabular-nums">
                  {String(stepIdx + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
                </div>
              )}
            </div>

            {/* PROGRESS BAR — four nodes */}
            {!submitted && (
              <div className="flex items-center gap-1 mb-6 md:mb-10">
                {STEPS.map((_, i) => {
                  const filled = i < stepIdx || (i === stepIdx && !!currentValue)
                  const active = i === stepIdx
                  return (
                    <div
                      key={i}
                      className="flex-1 h-px transition-all duration-500"
                      style={{
                        background: filled
                          ? '#73C5CC'
                          : active
                            ? 'rgba(115, 197, 204, 0.35)'
                            : 'rgba(255, 255, 255, 0.08)',
                        transform: active ? 'scaleY(3)' : 'scaleY(1)',
                        transformOrigin: 'center',
                      }}
                    />
                  )
                })}
              </div>
            )}

            {submitted ? (
              <div className="py-6">
                <div className="text-brand-teal text-[10px] uppercase tracking-[0.35em] font-medium mb-3">
                  Received
                </div>
                <h3 className="text-text-primary font-black text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[0.95] tracking-tight mb-4">
                  We'll be in touch.
                </h3>
                <p className="text-text-secondary text-[13px] md:text-[14px] leading-relaxed">
                  Thanks, {getValues('name')?.split(' ')[0] || 'and welcome'} — we'll reply
                  within 24 hours to{' '}
                  <span className="text-text-primary">{getValues('email')}</span>.
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  advance()
                }}
                className="flex flex-col gap-5"
              >
                {/* STEP CONTENT — cross-fade via key change */}
                <div
                  key={stepIdx}
                  className="flex flex-col gap-5"
                  style={{ animation: 'surveyStepIn 520ms cubic-bezier(0.22, 1, 0.36, 1)' }}
                >
                  <div className="text-text-secondary text-[10px] md:text-[11px] uppercase tracking-[0.3em] font-medium">
                    {currentStep.label}
                  </div>
                  <h3 className="text-text-primary font-black text-[clamp(1.75rem,5vw,2.75rem)] leading-[0.95] tracking-tight">
                    {currentStep.question}
                  </h3>

                  {/* Input — kind-dependent */}
                  {currentStep.kind === 'text' || currentStep.kind === 'email' ? (
                    <input
                      {...register(currentStep.field)}
                      ref={(el) => {
                        inputRef.current = el
                        // Also register with react-hook-form's ref via its callback
                        register(currentStep.field).ref(el)
                      }}
                      type={currentStep.kind}
                      autoComplete={currentStep.kind === 'email' ? 'email' : 'name'}
                      placeholder={currentStep.placeholder}
                      onKeyDown={handleKeyDown}
                      className="w-full bg-transparent border-0 border-b border-white/20 focus:border-brand-teal outline-none py-3 text-text-primary text-[18px] md:text-[22px] font-medium transition-colors duration-300 placeholder:text-text-secondary/50"
                    />
                  ) : currentStep.kind === 'textarea' ? (
                    <textarea
                      {...register(currentStep.field)}
                      ref={(el) => {
                        inputRef.current = el
                        register(currentStep.field).ref(el)
                      }}
                      placeholder={currentStep.placeholder}
                      rows={4}
                      onKeyDown={handleKeyDown}
                      className="w-full bg-transparent border-0 border-b border-white/20 focus:border-brand-teal outline-none py-3 text-text-primary text-[15px] md:text-[17px] font-medium transition-colors duration-300 placeholder:text-text-secondary/50 resize-none leading-relaxed"
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 md:gap-2">
                      {currentStep.choices?.map((c) => {
                        const selected = watch(currentStep.field) === c.value
                        return (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => {
                              setValue(currentStep.field, c.value as ContactValues[StepField], {
                                shouldValidate: true,
                              })
                            }}
                            className="group text-left rounded-[3px] border px-3.5 md:px-4 py-3 md:py-4 transition-all duration-300"
                            style={{
                              background: selected
                                ? 'rgba(115, 197, 204, 0.1)'
                                : 'rgba(255, 255, 255, 0.02)',
                              borderColor: selected
                                ? 'rgba(115, 197, 204, 0.6)'
                                : 'rgba(255, 255, 255, 0.12)',
                            }}
                          >
                            <div className="text-text-primary text-[14px] md:text-[16px] font-medium">
                              {c.label}
                            </div>
                            {c.hint && (
                              <div
                                className="text-[10px] md:text-[11px] mt-0.5 transition-colors"
                                style={{
                                  color: selected
                                    ? 'rgba(115, 197, 204, 0.9)'
                                    : 'rgba(125, 133, 145, 0.8)',
                                }}
                              >
                                {c.hint}
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Error message */}
                  {errors[currentStep.field] && (
                    <div className="text-[12px] text-brand-teal/80">
                      {errors[currentStep.field]?.message}
                    </div>
                  )}
                </div>

                {/* NAV ROW — stacked on mobile so both buttons get full width. */}
                <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-4 mt-2 md:mt-4">
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={stepIdx === 0}
                    className="text-text-secondary text-[11px] uppercase tracking-[0.25em] font-medium hover:text-text-primary transition-colors duration-300 disabled:opacity-0 disabled:cursor-default py-2 md:py-0 text-center md:text-left"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative overflow-hidden rounded-[3px] border border-brand-teal/70 hover:border-brand-teal bg-brand-teal/10 hover:bg-brand-teal/20 text-text-primary font-medium text-[11px] md:text-[12px] uppercase tracking-[0.25em] px-6 md:px-7 py-3.5 transition-all duration-300 disabled:opacity-50"
                  >
                    {stepIdx === STEPS.length - 1
                      ? isSubmitting
                        ? 'Sending…'
                        : 'Send enquiry'
                      : 'Continue →'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Hint on desktop only — mobile uses taps, no keyboard shortcut. */}
          {!submitted && (
            <div className="hidden md:block mt-4 text-center md:text-right text-text-secondary/50 text-[10px] uppercase tracking-[0.25em]">
              Press Enter to continue{STEPS[stepIdx].kind === 'textarea' ? ' · ⌘/Ctrl + Enter on this step' : ''}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes surveyStepIn {
          from {
            opacity: 0;
            transform: translateY(14px);
            filter: blur(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
        }
      `}</style>
    </div>
  )
}
