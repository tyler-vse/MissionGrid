import { APP_CONFIG } from '@/config/app.config'

export type ActivityStatus = (typeof APP_CONFIG.defaultStatuses)[number]
