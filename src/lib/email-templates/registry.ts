import type { ComponentType } from 'react'
import { template as bookingConfirmationTemplate } from './booking-confirmation'
import { template as bookingConfirmedTemplate } from './booking-confirmed'
import { template as bookingDeclinedTemplate } from './booking-declined'
import { template as bookingNotificationTemplate } from './booking-notification'
import { template as adminAccessRequestTemplate } from './admin-access-request'
import { template as adminAccessDecisionTemplate } from './admin-access-decision'
import { template as photoshootingNotificationTemplate } from './photoshooting-notification'
import { template as paymentReminderTemplate } from './payment-reminder'
import { template as personalMessageTemplate } from './personal-message'
import { template as contentdrehReplyTemplate } from './contentdreh-reply'
import { template as duoPriceConfirmationTemplate } from './duo-price-confirmation'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'booking-confirmation': bookingConfirmationTemplate,
  'booking-confirmed': bookingConfirmedTemplate,
  'booking-declined': bookingDeclinedTemplate,
  'booking-notification': bookingNotificationTemplate,
  'admin-access-request': adminAccessRequestTemplate,
  'admin-access-decision': adminAccessDecisionTemplate,
  'photoshooting-notification': photoshootingNotificationTemplate,
  'payment-reminder': paymentReminderTemplate,
  'personal-message': personalMessageTemplate,
  'contentdreh-reply': contentdrehReplyTemplate,
  'duo-price-confirmation': duoPriceConfirmationTemplate,
}

