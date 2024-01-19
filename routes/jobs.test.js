"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  AdminToken
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "new Job route",
    salary: 60000,
    equity: 0.5,
    company_handle: 'c2',
  };

  test("ok for admin users", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${AdminToken}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: {
        title: "new Job route",
        salary: 60000,
        equity: "0.5",
        company_handle: 'c2',
      }
    });
  });

  test("not ok for non-admin users", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          title: "new Job",
          salary: 50000,
          equity: 0,
        })
        .set("authorization", `Bearer ${AdminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          ...newJob,
          company_handle: "not-a-company",
        })
        .set("authorization", `Bearer ${AdminToken}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs:
          [
            {
          title: "Job 1",
          salary: 50000,
          equity: "1",
          company_handle: 'c1'
            },
            {
          title: "Job 2",
          salary: 100000,
          equity: "0",
          company_handle: 'c3'
            }
          ],
    });
  });

  // Get jobs is the title includes 2
  test("filter by title", async function () {
    const resp = await request(app).get("/jobs?title=2");
    expect(resp.body).toEqual({
      jobs:
          [
            {
              title: "Job 2",
          salary: 100000,
          equity: "0",
          company_handle: 'c3'
            },
          ],
    });
  });
// Get jobs with equity
  test("filter by equity", async function () {
    const resp = await request(app).get("/jobs").query({hasEquity: true});
    expect(resp.body).toEqual({
      jobs:
          [
            {
              title: "Job 1",
          salary: 50000,
          equity: "0.2",
          company_handle: 'c1'
            }
          ],
    });
  });

  test("fails: test next() id", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
        .get("/jobs")
        .set("authorization", `Bearer ${AdminToken}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  test("works for anon", async function () {
    const resp = await request(app).get(`/jobs/1`);
    expect(resp.body).toEqual({
      job: {
          title: "Job 1",
      salary: 50000,
      equity: "1",
      company_handle: 'c1'
      },
    });
  });

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/99`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
  test("works for admin users", async function () {
    const resp = await request(app)
        .patch(`/jobs/1`)
        .send({
          title: "Job 1-new",
        })
        .set("authorization", `Bearer ${AdminToken}`);
    expect(resp.body).toEqual({
      job: {
        title: "Job 1-new",
      salary: 50000,
      equity: "1",
      company_handle: 'c1'
      },
    });
  });

  test("doesn't work for non-admin users", async function () {
    const resp = await request(app)
        .patch(`/jobs/1`)
        .send({
          name: "Job 1-new",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .patch(`/jobs/1`)
        .send({
          name: "Job 1-new",
        });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such job", async function () {
    const resp = await request(app)
        .patch(`/jobs/99`)
        .send({
          title: "Job 1-new",
        })
        .set("authorization", `Bearer ${AdminToken}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on id change attempt", async function () {
    const resp = await request(app)
        .patch(`/jobs/1`)
        .send({
          id: 100,
        })
        .set("authorization", `Bearer ${AdminToken}`);
    expect(resp.statusCode).toEqual(400);
  });

});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for admin users", async function () {
    const resp = await request(app)
        .delete(`/jobs/1`)
        .set("authorization", `Bearer ${AdminToken}`);
    expect(resp.body).toEqual({ deleted: "1" });
  });

  test("Doesn't work for non-admin users", async function () {
    const resp = await request(app)
        .delete(`/jobs/1`)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
        .delete(`/jobs/1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such job", async function () {
    const resp = await request(app)
        .delete(`/jobs/99`)
        .set("authorization", `Bearer ${AdminToken}`);
    expect(resp.statusCode).toEqual(404);
  });
});
