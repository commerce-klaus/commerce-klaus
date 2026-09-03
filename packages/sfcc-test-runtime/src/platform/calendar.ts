export interface SfccCalendar {
  time: Date
  add(field: number, value: number): void
  after(other: SfccCalendar): boolean
  before(other: SfccCalendar): boolean
  compareTo(other: SfccCalendar): number
  equals(other: SfccCalendar): boolean
  get(field: number): number
  getTime(): Date
  isLeapYear(year: number): boolean
  isSameDay(other: SfccCalendar): boolean
  set(field: number, value: number): void
  set(year: number, month: number, date: number): void
  set(year: number, month: number, date: number, hourOfDay: number, minute: number): void
  set(
    year: number,
    month: number,
    date: number,
    hourOfDay: number,
    minute: number,
    second: number,
  ): void
  setTime(date: Date): void
}

export class Calendar implements SfccCalendar {
  static readonly YEAR = 1
  static readonly MONTH = 2
  static readonly DATE = 5
  static readonly DAY_OF_MONTH = 5
  static readonly DAY_OF_YEAR = 6
  static readonly DAY_OF_WEEK = 7
  static readonly AM_PM = 9
  static readonly HOUR = 10
  static readonly HOUR_OF_DAY = 11
  static readonly MINUTE = 12
  static readonly SECOND = 13
  static readonly MILLISECOND = 14

  private date: Date

  constructor(date = new Date()) {
    this.date = new Date(date.getTime())
  }

  get time(): Date {
    return this.getTime()
  }

  set time(date: Date) {
    this.setTime(date)
  }

  add(field: number, value: number): void {
    switch (field) {
      case Calendar.YEAR: {
        const day = this.date.getUTCDate()
        this.date.setUTCDate(1)
        this.date.setUTCFullYear(this.date.getUTCFullYear() + value)
        this.date.setUTCDate(Math.min(day, this.daysInMonth()))
        return
      }
      case Calendar.MONTH: {
        const day = this.date.getUTCDate()
        this.date.setUTCDate(1)
        this.date.setUTCMonth(this.date.getUTCMonth() + value)
        this.date.setUTCDate(Math.min(day, this.daysInMonth()))
        return
      }
      case Calendar.DATE:
      case Calendar.DAY_OF_YEAR:
        this.date.setUTCDate(this.date.getUTCDate() + value)
        return
      case Calendar.HOUR:
      case Calendar.HOUR_OF_DAY:
        this.date.setUTCHours(this.date.getUTCHours() + value)
        return
      case Calendar.MINUTE:
        this.date.setUTCMinutes(this.date.getUTCMinutes() + value)
        return
      case Calendar.SECOND:
        this.date.setUTCSeconds(this.date.getUTCSeconds() + value)
        return
      case Calendar.MILLISECOND:
        this.date.setUTCMilliseconds(this.date.getUTCMilliseconds() + value)
        return
      default:
        throw new Error(`SFCC Calendar does not support field ${field}.`)
    }
  }

  after(other: SfccCalendar): boolean {
    return this.date.getTime() > other.getTime().getTime()
  }

  before(other: SfccCalendar): boolean {
    return this.date.getTime() < other.getTime().getTime()
  }

  compareTo(other: SfccCalendar): number {
    return Math.sign(this.date.getTime() - other.getTime().getTime())
  }

  equals(other: SfccCalendar): boolean {
    return this.compareTo(other) === 0
  }

  get(field: number): number {
    switch (field) {
      case Calendar.YEAR:
        return this.date.getUTCFullYear()
      case Calendar.MONTH:
        return this.date.getUTCMonth()
      case Calendar.DATE:
        return this.date.getUTCDate()
      case Calendar.DAY_OF_YEAR: {
        const start = Date.UTC(this.date.getUTCFullYear(), 0, 0)
        return Math.floor((this.date.getTime() - start) / 86_400_000)
      }
      case Calendar.DAY_OF_WEEK:
        return this.date.getUTCDay() + 1
      case Calendar.AM_PM:
        return this.date.getUTCHours() >= 12 ? 1 : 0
      case Calendar.HOUR:
        return this.date.getUTCHours() % 12
      case Calendar.HOUR_OF_DAY:
        return this.date.getUTCHours()
      case Calendar.MINUTE:
        return this.date.getUTCMinutes()
      case Calendar.SECOND:
        return this.date.getUTCSeconds()
      case Calendar.MILLISECOND:
        return this.date.getUTCMilliseconds()
      default:
        throw new Error(`SFCC Calendar does not support field ${field}.`)
    }
  }

  getTime(): Date {
    return new Date(this.date.getTime())
  }

  isLeapYear(year: number): boolean {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  }

  isSameDay(other: SfccCalendar): boolean {
    const date = other.getTime()
    return (
      this.date.getUTCFullYear() === date.getUTCFullYear() &&
      this.date.getUTCMonth() === date.getUTCMonth() &&
      this.date.getUTCDate() === date.getUTCDate()
    )
  }

  set(field: number, value: number): void
  set(year: number, month: number, date: number): void
  set(year: number, month: number, date: number, hourOfDay: number, minute: number): void
  set(
    year: number,
    month: number,
    date: number,
    hourOfDay: number,
    minute: number,
    second: number,
  ): void
  set(...values: number[]): void {
    if (values.length === 2) {
      this.setField(values[0] as number, values[1] as number)
      return
    }

    const [year, month, date, hourOfDay, minute, second] = values
    this.date.setUTCFullYear(year as number, month as number, date as number)
    if (hourOfDay !== undefined && minute !== undefined) {
      this.date.setUTCHours(hourOfDay, minute, second ?? this.date.getUTCSeconds())
    }
  }

  setTime(date: Date): void {
    this.date = new Date(date.getTime())
  }

  private daysInMonth(): number {
    return new Date(
      Date.UTC(this.date.getUTCFullYear(), this.date.getUTCMonth() + 1, 0),
    ).getUTCDate()
  }

  private setField(field: number, value: number): void {
    switch (field) {
      case Calendar.YEAR:
        this.date.setUTCFullYear(value)
        return
      case Calendar.MONTH:
        this.date.setUTCMonth(value)
        return
      case Calendar.DATE:
      case Calendar.DAY_OF_YEAR:
        if (field === Calendar.DAY_OF_YEAR) {
          this.date.setUTCMonth(0, value)
        } else {
          this.date.setUTCDate(value)
        }
        return
      case Calendar.HOUR:
        this.date.setUTCHours((this.date.getUTCHours() >= 12 ? 12 : 0) + value)
        return
      case Calendar.HOUR_OF_DAY:
        this.date.setUTCHours(value)
        return
      case Calendar.MINUTE:
        this.date.setUTCMinutes(value)
        return
      case Calendar.SECOND:
        this.date.setUTCSeconds(value)
        return
      case Calendar.MILLISECOND:
        this.date.setUTCMilliseconds(value)
        return
      default:
        throw new Error(`SFCC Calendar does not support field ${field}.`)
    }
  }
}
