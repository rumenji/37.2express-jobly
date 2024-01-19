const { BadRequestError } = require("../expressError");
const { sqlForPartialUpdate } = require("./sql");

describe("create SQL command from JSON", function () {
  test("works: user", function () {
    const data = { firstName: "John", lastName: "Doe"}
    const { setCols, values } = sqlForPartialUpdate(
      data,
      {
        firstName: "first_name",
        lastName: "last_name",
        isAdmin: "is_admin",
      });
      console.log(setCols, values)
    expect(setCols).toEqual(
      "\"first_name\"=$1, \"last_name\"=$2"
    );
    expect(values).toEqual(
      ["John", "Doe"]
    )
  });

  test("doesn't work: empty user", function () {
    const data = {}
    try{
      const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          firstName: "first_name",
          lastName: "last_name",
          isAdmin: "is_admin",
        });
    } catch(err){
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});
