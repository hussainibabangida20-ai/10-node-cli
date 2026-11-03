export function parseCsvRecord(record) {
  const fields = [];
  let field = "";
  let inQuotes = false;
  let quoteClosed = false;

  for (let index = 0; index < record.length; index += 1) {
    const character = record[index];

    if (inQuotes) {
      if (character === '"') {
        if (record[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
          quoteClosed = true;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === ",") {
      fields.push(field);
      field = "";
      quoteClosed = false;
    } else if (character === '"' && field === "" && !quoteClosed) {
      inQuotes = true;
    } else if (quoteClosed && character !== "\r" && character !== "\n") {
      throw new Error("Unexpected character after a quoted CSV field.");
    } else if (character === '"') {
      throw new Error("Unexpected quote in an unquoted CSV field.");
    } else {
      field += character;
    }
  }

  if (inQuotes) {
    throw new Error("Unterminated quoted CSV field.");
  }
  fields.push(field.replace(/\r$/, ""));
  return fields;
}

export function isCsvRecordComplete(record) {
  let inQuotes = false;

  for (let index = 0; index < record.length; index += 1) {
    if (record[index] !== '"') {
      continue;
    }
    if (inQuotes && record[index + 1] === '"') {
      index += 1;
    } else {
      inQuotes = !inQuotes;
    }
  }
  return !inQuotes;
}
