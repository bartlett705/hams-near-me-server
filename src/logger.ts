import chalk from 'chalk'
import Koa from 'koa'
import { Client } from 'pg'
import { config } from './config'

interface LogData {
  data: any
  errorMessage: string
  errorStack: string
  host: string
  input: string
  method: string
  query: string
  remoteAddress: string
  responseTime: number
  statusCode: number
  url: string
  userAgent: string
}

const error = chalk.bold.red
const warn = chalk.keyword('orange')
const info = chalk.blueBright
const debug = chalk.white
const externalCall = chalk.black.bgGreenBright

const noOp = (): void => undefined

export class Logger {
  public error: (...args: any) => void
  public warn: (...args: any) => void
  public info: (...args: any) => void
  public debug: (...args: any) => void
  public externalCall: (...args: any) => void

  private logLevel: number
  constructor(logLevel: number) {
    this.logLevel = logLevel
    this.error = (...args: any) => console.log(error(...args))
    this.warn =
      logLevel > 0 ? (...args: any) => console.log(warn(...args)) : noOp
    this.info =
      logLevel > 1 ? (...args: any) => console.log(info(...args)) : noOp
    this.debug =
      logLevel > 2 ? (...args: any) => console.log(debug(...args)) : noOp
    this.externalCall =
      logLevel > 2 ? (...args: any) => console.log(externalCall(...args)) : noOp
  }
}

export const requestLoggerMiddleware = (
  logger: Logger,
  dbClient: Client
) => async (ctx: Koa.Context, next: () => Promise<any>) => {
  ctx.state.logger = logger
  ctx.state.dbClient = dbClient
  const start = new Date().getMilliseconds()
  const logData: Partial<LogData> = {
    host: ctx.headers.host,
    input:
      ctx.method === 'POST' &&
      ctx.request.body &&
      (ctx.request.body as any).input,
    method: ctx.method,
    query: ctx.query,
    remoteAddress: ctx.request.ip,
    url: ctx.url,
    userAgent: ctx.headers['user-agent']
  }

  let errorThrown: any = null
  try {
    await next()
    logData.statusCode = ctx.status
  } catch (e) {
    errorThrown = e
    logData.errorMessage = e.message
    logData.errorStack = e.stack
    logData.statusCode = e.status || 500
    if (e.data) {
      logData.data = e.data
    }
  }

  logData.responseTime = new Date().getMilliseconds() - start
  outputLog(logger, logData, errorThrown)

  if (errorThrown) {
    throw errorThrown
  }
}

function outputLog(logger: Logger, data: Partial<LogData>, thrownError: any) {
  if (config.prettyPrint) {
    let annotation = ''
    if (data.url === '/' && data.method === 'POST') {
      annotation = `| "${data.input}" |`
    }
    logger.info(
      `${data.statusCode} ${data.method} ${
        data.url === '/' ? annotation : data.url
      } - ${data.responseTime}ms`
    )
    if (thrownError) {
      logger.error(thrownError)
    }
  } else if (data.statusCode < 400) {
    process.stdout.write(JSON.stringify(data) + '\n')
  } else {
    process.stderr.write(JSON.stringify(data) + '\n')
  }
}