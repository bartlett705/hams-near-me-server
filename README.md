# ULS Record Parser Script

- Reads a specified `.dat` pipe-delimited file record of ULS entries and inserts basic info into a PSQL database for further analysis.
- Specifically tuned for the Amateur license records; would probably work on other ULS `.dat` files as well.
- Currently fails on duplicate entries for callsign (used as a primary key) TODO: update non-primary fields in this situation instea.
- Assumes a `.env` file present in the project root to configure a `psql` database connection.
- Processes records one-at-a-time to avoid excessive memory usage trying to keep track of in-flight db operations at the cost of throughput. Processed > 1 MM records in ~30 mins on a couple-year-old core i7 /shrug

# Instructions

1. Download and unzip some `.dat` files from [ULS](https://fcc.gov).
2. Enter the name of the `.dat` file you wish to parse into `read-huge-file.js`.
3. `npm s`.
4. Profit.

# Backend

Serves the above on a KOA endpoint that accepts zip and returns all records that match 