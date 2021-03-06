import cors from '@koa/cors'
import chalk from 'chalk'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import { Client } from 'pg'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { BuildType, config } from './config'
import { Discord } from './discord'
import { Logger, requestLoggerMiddleware } from './logger'
import { routes } from './routes'

const logger = new Logger(config.logLevel)
const { PGHOST, PGPORT, PGDATABASE, PGUSER } = process.env
logger.debug(`DB ${PGUSER}@${PGHOST}:${PGPORT}/${PGDATABASE}`)
const dbClient = new Client()

export const discord = new Discord(
  'dtbYSvMVqUQxO2iNR90TQZ0wqUQO-fcfKGWPriBJepf2mdKecun8c5esrLegLWzILHTJ',
  '540026980205330453'
)

dbClient.connect()

const app = new Koa()
app.proxy = true

const rateLimiterOpts = {
  duration: 10, // Time to reset
  points: 3
}

const rateLimiter = new RateLimiterMemory(rateLimiterOpts)

app.use(
  cors({
    allowMethods: ['GET', 'POST'],
    credentials: true
  })
)

app.use(async (ctx, next) => {
  try {
    await rateLimiter.consume(
      ctx.request.ips.length ? JSON.stringify(ctx.request.ips) : ctx.request.ip
    )
    await next()
  } catch (rejRes) {
    ctx.status = 429
    ctx.body = 'Too Many Requests'
  }
})

app.use(
  bodyParser({
    onerror(err, ctx) {
      logger.error('Body Parser shat:', err)
      ctx.throw('body parse error', 422)
    }
  })
)

app.use(requestLoggerMiddleware(logger, dbClient))

app.use(routes)
app.listen(config.port)

logger.warn('hi yall ^_^')
console.log(
  chalk.greenBright(
    `hammers-near-me backend is running on port ${config.port} | `
  ),
  chalk.greenBright('build type:'),
  config.buildType === BuildType.Production
    ? chalk.redBright('PROD')
    : chalk.yellowBright(config.buildType)
)
