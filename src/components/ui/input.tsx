import * as React from 'react'
import { Input as InputPrimitive } from '@base-ui/react/input'
import { cn } from '@/lib/utils'

function Input({ className, ...props }: React.ComponentProps<typeof InputPrimitive>) {
  return (
    <InputPrimitive
      data-slot="input"
      className={cn(
        'h-9 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none placeholder:text-faint',
        'focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary-soft focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-bad',
        className,
      )}
      {...props}
    />
  )
}

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'w-full resize-none rounded-lg border border-input bg-card px-3 py-2.5 text-sm leading-normal text-foreground outline-none placeholder:text-faint',
        'focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary-soft focus-visible:outline-none',
        className,
      )}
      {...props}
    />
  )
}

export { Input, Textarea }
