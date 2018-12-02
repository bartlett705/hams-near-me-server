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
  ctx.status = 223
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

  logger.debug('Got a post')
  const result = await queryDB(
    logger,
    dbClient,
    `SELECT call, name FROM hammers
    WHERE zip = ${zip} OR zip > ${zip}0000 AND zip < ${+zip + 1}0000;`
  )

  if (result && result.rows) {
    const sortedRows = result.rows
      .sort((recordA, recordB) => {
        // console.log(
        //   recordA.name,
        //   recordB.name,
        //   recordA.name.charCodeAt(0) - recordB.name.charCodeAt(0)
        // )
        const firstLetterComp =
          recordA.name.charCodeAt(0) - recordB.name.charCodeAt(0)
        return firstLetterComp === 0
          ? recordA.name.charCodeAt(1) - recordB.name.charCodeAt(1)
          : firstLetterComp
      })
      .map((record) => ({
        calls: [record.call],
        name: record.name
          .split(' ')
          .map(
            (word: string) =>
              word[0].toUpperCase() + word.slice(1).toLowerCase()
          )
          .join(' ')
      }))
      .reduce((deDupedByCall, recordA) => {
        const existingRecord = deDupedByCall.find(
          (e) => e.name === recordA.name
        )
        if (existingRecord) {
          existingRecord.calls = existingRecord.calls.concat(recordA.calls)
        } else {
          deDupedByCall.push(recordA)
        }
        return deDupedByCall
      }, [])

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
