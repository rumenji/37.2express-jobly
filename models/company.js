"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");
const { filter } = require("./job");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll(criteria = {}) {
    const { name, minEmployees, maxEmployees } = criteria;
    let filterTerms = [];
    let variableValues = [];

    let sqlQuery = 
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies`;

    if(minEmployees > maxEmployees){
      throw new BadRequestError(`minEmployees cannot be larger than maxEmployees `);
    }

    if(minEmployees !== undefined){
      variableValues.push(minEmployees);
      filterTerms.push(`num_employees >=$${variableValues.length}`);
    }

    if(maxEmployees !== undefined){
      variableValues.push(maxEmployees);
      filterTerms.push(`num_employees <= $${variableValues.length}`);
    }

    if(name !== undefined){
      variableValues.push(`%${name}%`);
      filterTerms.push(`name ILIKE $${variableValues.length}`);
    }
    if (variableValues.length > 0){
      sqlQuery += " WHERE " + filterTerms.join(" AND ");
    }
    
    sqlQuery += " ORDER BY name";

    const companiesRes = await db.query(sqlQuery, variableValues);
    return companiesRes.rows;
  }

  /* Given filtering options, return matching companies.
  Checks if the criteria sent match name, min or maxEmployees.
  If none - returns all.
  If it includes min or max employees - sets the value of each - if no min - min is 0.
  If no max - max is 1,000,000. 
  Throws an error is min > max.
  The number is only included in the query is either of these
  values is set.
  Ignores criteria that is misspelled.
   */
  // static async filter(criteria) {
  //   let companiesRes;
  //   const { name, minEmployees, maxEmployees } = criteria;
  //   if(minEmployees || maxEmployees){
  //     if(minEmployees > maxEmployees){
  //       throw new BadRequestError(`minEmployees cannot be larger than maxEmployees `);
  //     }
  //     const min = minEmployees || 0;
  //     const max = maxEmployees || 1000000;
  //     if(name){
  //       const name_pattern = `%${name}%`
  //       companiesRes = await db.query(
  //         `SELECT handle,
  //                 name,
  //                 description,
  //                 num_employees AS "numEmployees",
  //                 logo_url AS "logoUrl"
  //          FROM companies WHERE name ILIKE $3 AND num_employees BETWEEN $1 AND $2
  //          ORDER BY name`, [min, max, name_pattern]);
  //     }else{
  //       companiesRes = await db.query(
  //         `SELECT handle,
  //                 name,
  //                 description,
  //                 num_employees AS "numEmployees",
  //                 logo_url AS "logoUrl"
  //          FROM companies WHERE num_employees BETWEEN $1 AND $2
  //          ORDER BY name`, [min, max]);
  //     }
      
  //   } else if(name){
  //     const name_pattern = `%${name}%`
  //     companiesRes = await db.query(
  //       `SELECT handle,
  //               name,
  //               description,
  //               num_employees AS "numEmployees",
  //               logo_url AS "logoUrl"
  //        FROM companies WHERE name ILIKE $1
  //        ORDER BY name`, [name_pattern]);
  //   }else{
  //     companiesRes = await db.query(
  //       `SELECT handle,
  //               name,
  //               description,
  //               num_employees AS "numEmployees",
  //               logo_url AS "logoUrl"
  //        FROM companies
  //        ORDER BY name`);
  //   }
    
  //   return companiesRes.rows;
  // }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl",
                  json_agg(id) AS jobs
           FROM companies AS c
           LEFT JOIN jobs AS j ON (c.handle = j.company_handle)
           WHERE handle = $1 GROUP BY c.handle`,
        [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }



  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
