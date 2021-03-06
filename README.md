# Hams Near Me (Backend)

Site hosted at https://hams-near-me.mosey.systems

Frontend repo is [here](https://github.com/bartlett705/hams-near-me-client)

Serves the data gathered by the script below on a KOA endpoint that accepts a POST with a single zip property, and returns all records that match as JSON.

## ULS Record Parser Script

- Reads a specified `.dat` pipe-delimited file record of ULS entries and inserts basic info into a PSQL database for further analysis.
- Specifically tuned for the Amateur license records (`EN.dat`); would probably work on other ULS `.dat` files as well with small adjustments for field names.
- Assumes a `.env` file present in the project root to configure a `psql` database connection.
- Processes records one-at-a-time to avoid excessive memory usage trying to keep track of in-flight db operations at the cost of throughput. Processed > 1 MM records in ~30 mins on a couple-year-old core i7 /shrug

## Instructions for use

1. Download and unzip some `.dat` files from [ULS](https://fcc.gov).
2. Enter the path of the `EN.dat` file you wish to parse into `read-huge-file.js`.
3. `node scripts/read-huge-file`.
4. Wait a bit(!!!)
5. `npm start` to load the server on local port 7337. You should now be able to `npm start` in the client project as well and connect to `localhost:8080` to see it all working.
