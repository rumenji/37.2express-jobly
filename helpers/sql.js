const { BadRequestError } = require("../expressError");

/* THIS NEEDS SOME GREAT DOCUMENTATION.
*Receives dataToUpdate as { firstName: "John", lastName: "Doe"}
*Receives jsToSql for the column names as {
*       firstName: "first_name",
*        lastName: "last_name",
*        isAdmin: "is_admin",
*      }
*Creates the names of the columns with their respective $number for the SQL command.
*Also resturns an array of the values in the same order. */
function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  // Gets the names of the keys to an array
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  console.log(dataToUpdate)
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
