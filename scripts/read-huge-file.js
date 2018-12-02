/**
 *
 * sources:
 *  - stackoverflow.com/questions/16010915/parsing-huge-logfiles-in-node-js-read-in-line-by-line
 **/
require('dotenv').config()
const { Client } = require('pg')
const chalk = require('chalk')
const fs = require('fs')
const es = require('event-stream')
const parseRecord = require('./parse-record')

const { PGHOST, PGPORT, PGDATABASE, PGUSER } = process.env
dbLog(`DB ${PGUSER}@${PGHOST}:${PGPORT}/${PGDATABASE}`)
const client = new Client()

function dbLog(s) {
  console.log(chalk.yellow(s))
}

async function main() {
  await client.connect()
  dbLog('Connected')

  //   dbLog("Creating Table");
  //   await queryDB(
  //     client,
  //     `
  //     CREATE TABLE hammers (
  //       call varchar(12) PRIMARY KEY,
  //       name varchar(255),
  //       addr1 varchar(255),
  //       addr2 varchar(255),
  //       addr3 varchar(255),
  //       zip int
  //     );
  //   `
  //   );

  var lineNr = 0

  var s = fs
    .createReadStream('snip.dat.example')
    .pipe(es.split())
    .pipe(
      es
        .mapSync(async function(line) {
          s.pause()
          lineNr += 1

          //   entries.push(process(line));
          const { callSign, fullName, addr1, addr2, addr3, zip } = parseRecord(
            line
          )
          const query =
            'INSERT INTO hammers(call, name, addr1, addr2, addr3, zip) VALUES ($1, $2, $3, $4, $5, $6)'
          const params = [callSign, fullName, addr1, addr2, addr3, zip]
          try {
            await queryDB(client, query, params)
          } catch {}
          logMemoryUsage(lineNr)
          s.resume()
        })
        .on('error', function(err) {
          console.log('Error while reading file.', err)
        })
        .on('end', async function() {
          console.log(chalk.green('Read entire file.'))
          console.log(chalk.blue('Ending client sesh'))
          await client.end()
        })
    )
}

async function queryDB(client, query, params) {
  return new Promise(async (res, _) => {
    try {
      const result = await client.query(query, params)
      res(result)
    } catch (err) {
      console.error(chalk.red(err))
      res()
    }
  })
}

function logMemoryUsage(lineNr) {
  console.log('Processing Record: ', lineNr)
}

main()
