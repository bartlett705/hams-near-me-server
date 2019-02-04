/**
 * Parse huge text files (in this case the ULS record format) and insert them into a psql database.
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
  const filename = process.argv[2]
  if (!fs.existsSync(filename)) {
    console.log(filename, ' not found; skipping.')
    process.exit(0)
  }

  console.log('Parsing ', filename)
  var s = fs
    .createReadStream(filename)
    .pipe(es.split())
    .pipe(
      es
        .mapSync(async function(line) {
          s.pause()
          lineNr += 1
          if (line) {
            const {
              callSign,
              fullName,
              addr1,
              addr2,
              addr3,
              zip
            } = parseRecord(line)
            const query = `INSERT INTO hammers(call, name, addr1, addr2, addr3, zip) 
              VALUES ($1, $2, $3, $4, $5, $6) 
              ON CONFLICT (call) 
              DO UPDATE 
              SET name = EXCLUDED.name, addr1 = EXCLUDED.addr1, addr2 = EXCLUDED.addr2, addr3 = EXCLUDED.addr3, zip = EXCLUDED.zip`
            const params = [callSign, fullName, addr1, addr2, addr3, zip]
            try {
              await queryDB(client, query, params)
            } catch {}
            logMemoryUsage(lineNr, callSign, fullName)
          } else {
            console.log('Skipping blank record.')
          }
          s.resume()
        })
        .on('error', function(err) {
          console.log('Error while reading file.', err)
        })
        .on('end', async function() {
          console.log(chalk.green('Read entire file. Total Records: ', lineNr))
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

function logMemoryUsage(lineNr, callSign, fullName) {
  // if (lineNr % 1000 === 0) {
  console.log('Processing Record: ', lineNr, callSign, fullName)
  // }
}

main()
