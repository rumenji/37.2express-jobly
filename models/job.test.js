"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError.js");
const Company = require("./company.js");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon.js");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "new Job",
    salary: 50000,
    equity: '0',
    company_handle: 'c2',
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual({
      title: "new Job",
  salary: 50000,
  equity: "0",
  company_handle: "c2"
    });

    const result = await db.query(
          `SELECT title, salary, equity, company_handle
           FROM jobs
           WHERE title = 'new Job'`);
    expect(result.rows).toEqual([
      {
        title: "new Job",
    salary: 50000,
    equity: "0",
    company_handle: "c2"
      },
    ]);
  });

});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        title: "Job 1",
    salary: 50000,
    equity: "0.2",
    company_handle: 'c1'
      },
      {
        title: "Job 2",
    salary: 100000,
    equity: "0",
    company_handle: 'c3'
      }
    ]);
  });
});

/* Test filtering*/
describe("filter", function () {
  // Filter by title
  test("filter by title", async function () {
    const criteria = {title: "2"}
    const result = await Job.findAll(criteria)
    expect(result).toEqual([
      {
        title: "Job 2",
    salary: 100000,
    equity: "0",
    company_handle: 'c3'
      }
    ]);
  });

// Filter by number of employees
  test("filter by minSalary", async function () {
    const criteria = {minSalary: 60000}
    const result = await Job.findAll(criteria)
    expect(result).toEqual([{
      title: "Job 2",
    salary: 100000,
    equity: "0",
    company_handle: 'c3'
    }
    ]);
  });
// Filter by both name and employees
  // test("filter by equity", async function () {
  //   const criteria = {hasEquity: true}
  //   const result = await Job.findAll(criteria)
  //   expect(result).toEqual([
  //     {
  //       title: "Job 1",
  //   salary: 50000,
  //   equity: "0.2",
  //   company_handle: 'c1'
  //     }
  //   ]);
  // });
});
/************************************** get */

describe("get", function () {
  test("works", async function () {
    let job = await Job.get("1");
    expect(job).toEqual({
      title: "Job 1",
    salary: 50000,
    equity: "0.2",
    company_handle: 'c1'
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get("99");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    title: "New Job 1",
    salary: 30000,
    equity: '1',
    company_handle: "c1"
  };

  test("works", async function () {
    let job = await Job.update(1, updateData);
    expect(job).toEqual({
      title: "New Job 1",
    salary: 30000,
    equity: "1",
    company_handle: "c1"
    });

    const result = await db.query(
          `SELECT title, salary, equity, company_handle
           FROM jobs
           WHERE id = 1`);
    expect(result.rows).toEqual([{
      title: "New Job 1",
    salary: 30000,
    equity: "1",
    company_handle: "c1"
    }]);
  });


  test("not found if no such company", async function () {
    try {
      await Job.update(99, updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Job.update("1", {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Job.remove("1");
    const res = await db.query(
        "SELECT id FROM jobs WHERE id='1'");
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such company", async function () {
    try {
      await Job.remove("99");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
