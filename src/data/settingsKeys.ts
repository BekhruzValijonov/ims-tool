/** Ключи таблицы settings. Строковые литералы не разбредаются по коду. */
export const OPERATOR_NAME_KEY = "operator_full_name"
export const BRANDING_KEY = "branding"

/**
 * За сколько до конца поверки прибор попадает в «истекает».
 *
 * 30 дней: меньше — метролог не успевает договориться с поверочной
 * организацией, больше — плитка перестаёт быть сигналом и всегда горит.
 */
export const VERIFICATION_HORIZON_DAYS = 30
export const VERIFICATION_HORIZON_MS = VERIFICATION_HORIZON_DAYS * 24 * 60 * 60 * 1000
