function parseRecord(pipeDelimited) {
  const fields = pipeDelimited.split('|')
  const record = {
    callSign: fields[4].toUpperCase(),
    fullName: fields[7].toUpperCase(),
    addr1: fields[15].toUpperCase(),
    addr2: fields[16].toUpperCase(),
    addr3: fields[17].toUpperCase(),
    zip: fields[18].toUpperCase()
  }

  return record
}

module.exports = parseRecord
