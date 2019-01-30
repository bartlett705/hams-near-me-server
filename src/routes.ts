import Koa from 'koa'
import Router from 'koa-router'
import { Client, QueryResult } from 'pg'
import { Logger } from './logger'

interface Hammer {
  name: string
  call: string
}

const router = new Router()
router.get('/', (ctx: Koa.Context) =>
  ctx.state.logger.warn('!random getter detected!')
)

router.get('/healthcheck', (ctx: Koa.Context) => {
  ctx.status = 200
  ctx.body = 'pongHi'
  return
})

interface PostBody {
  zip: number
}

router.post('/', async (ctx: Koa.Context) => {
  const logger = ctx.state.logger as Logger
  const dbClient = ctx.state.dbClient as Client

  const { body } = ctx.request
  logger.info(JSON.stringify(body))
  const { response } = ctx
  const { zip } = body as PostBody

  if (Number.isNaN(Number(zip))) {
    ctx.status = 422
    response.body = JSON.stringify({
      errMessage: "Invalid zip; don't use + or -; example: 920563043"
    })
    return
  }

  if (Number(zip) === 0) {
    ctx.status = 422
    response.body = JSON.stringify({
      errMessage:
        "Sorry, you can't search for ULS records with missing zips right now. Too many rows ☹"
    })
    return
  }

  logger.debug('Got a post')
  const query = `SELECT call, name FROM hammers
    WHERE zip = ${zip} OR zip > ${zip}0000 AND zip < ${+zip + 1}0000;`

  // paranoia?
  if (query.indexOf(';') < 78) {
    ctx.status = 422
    response.body = JSON.stringify({
      errMessage: 'Notsure if sql injection...'
    })
    return
  }
  const result = await queryDB(logger, dbClient, query)

  if (result && result.rows) {
    const sortedRows = result.rows
      // Sort by first two chars
      .sort((recordA, recordB) => {
        const firstLetterComp =
          (recordA.name && recordA.name.charCodeAt(0)) ||
          (0 - recordB.name && recordB.name.charCodeAt(0)) ||
          0
        return firstLetterComp === 0
          ? (recordA.name && recordA.name.charCodeAt(1)) ||
              (0 - recordB.name && recordB.name.charCodeAt(1)) ||
              0
          : firstLetterComp
      })
      // Title case names, transform single callsign into array of callsigns.
      .map((record) => ({
        calls: [record.call],
        name: record.name
          ? record.name
              .trim()
              .split(' ')
              // Random whitespace :notlikethis:
              .filter((word: string) => word.length)
              .map((word: string) => {
                if (typeof word[0] !== 'string') {
                  console.log('this is a bad word!', record.name.split(' '))
                }
                return word[0].toUpperCase() + word.slice(1).toLowerCase()
              })
              .join(' ')
          : 'Data Missing'
      }))
      // Collapse records with matching names into one with an array of callsigns
      .reduce((deDupedByCall, recordA) => {
        const existingRecord = deDupedByCall.find(
          (e) => e.name === recordA.name && recordA.name !== 'Data Missing'
        )
        if (existingRecord) {
          existingRecord.calls = existingRecord.calls.concat(recordA.calls)
        } else {
          deDupedByCall.push(recordA)
        }
        return deDupedByCall
      }, [])

    // Add to state for logger to pull off
    ctx.state.rowsReturned = result.rowCount
    ctx.state.dbCommand = query

    response.status = 200
    response.set('Content-Type', 'application/json')
    response.body = JSON.stringify(sortedRows)
  } else {
    response.status = 500
    response.body = 'Something went wrong :/'
  }
})

async function queryDB(
  logger: Logger,
  client: Client,
  query: string,
  params?: any
) {
  return new Promise<QueryResult | null>(async (res, _) => {
    try {
      console.info('QUERY:', query)
      const result = await client.query(query, params)
      if (result.rows) {
        console.info(`Returing ${result.rows.length} rows`)
      }
      res(result)
    } catch (err) {
      console.error('hrm')
      console.error(logger.error(err))
      res(null)
    }
  })
}

export const routes = router.routes()
