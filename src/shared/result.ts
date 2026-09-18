/**
 * Результат операции, которая может отказать по понятной причине.
 *
 * Отказ здесь — не исключение: «прибор уже выдан» это нормальный ответ
 * системы, который экран обязан показать человеку словами. Исключения
 * остаются за настоящими сбоями — недоступной базой, битым файлом.
 */
export type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E }

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}
