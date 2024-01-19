"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError, ExpressError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */
class Job{
    /*Create a job
    data should be { title, salary, equity, handle }
    Returns { title, salary, equity, company_handle }*/
    static async create({title, salary, equity, company_handle}){
        const result = await db.query(
            `INSERT INTO jobs
            (title, salary, equity, company_handle)
            VALUES ($1, $2, $3, $4)
            RETURNING title, salary, equity, company_handle`,
            [title, salary, equity, company_handle]
        )
        return result.rows[0];
    }

    /*Find all jobs */
    static async findAll(criteria = {}){
        const { title, minSalary, hasEquity } = criteria;
        let filterTerms = [];
        let variableValues = [];
        let sqlQuery = `SELECT title, salary, equity, company_handle FROM jobs`;
        
        if (minSalary !== undefined) {
            variableValues.push(minSalary);
            filterTerms.push(`salary >= $${variableValues.length}`);
          }
      
        if (hasEquity === true) {
        filterTerms.push(`equity > 0`);
        }
    
        if (title !== undefined) {
        variableValues.push(`%${title}%`);
        filterTerms.push(`title ILIKE $${variableValues.length}`);
        }
    
        if (variableValues.length > 0) {
        sqlQuery += " WHERE " + filterTerms.join(" AND ");
        }
    
        sqlQuery += " ORDER BY title";
        const jobsRes = await db.query(sqlQuery, variableValues);
        
        return jobsRes.rows;
    }

    /*Filter jobs by criteria */
    // static async filter(criteria){
    //     let jobsRes;
    //     const { title, minSalary, hasEquity } = criteria;
    //     if(title){
    //         const title_pattern = `%${title}%`
    //         jobsRes = await db.query(
    //             `SELECT title, salary, equity, company_handle
    //             FROM jobs
    //             WHERE title ILIKE $1`,
    //             [title_pattern]
    //         )
    //     }
    //     else if(minSalary && hasEquity){
    //         jobsRes = await db.query(
    //             `SELECT title, salary, equity, company_handle
    //             FROM jobs
    //             WHERE salary >= $1 AND equity > $2`,
    //             [minSalary, 0]
    //         )
    //     }
    //     else if(minSalary){
    //         jobsRes = await db.query(
    //             `SELECT title, salary, equity, company_handle
    //             FROM jobs
    //             WHERE salary >= $1`,
    //             [minSalary]
    //         )
    //     }
    //     else if(hasEquity){
    //         jobsRes = await db.query(
    //             `SELECT title, salary, equity, company_handle
    //             FROM jobs
    //             WHERE equity > $1`,
    //             [0]
    //         )
    //     }
    //     console.log(`Filter ${jobsRes}`)
    //     return jobsRes.rows;
    // }

    /*Given job id return details for the job
    Returns {title, salary, equity, company_handle}  */

    static async get(id){
        const jobRes = await db.query(
            `SELECT title, salary, equity, company_handle
            FROM jobs
            WHERE id = $1`,
            [id]
        )
        const job = jobRes.rows[0];
        if (!job) throw new NotFoundError(`No job with id ${id}`);

        return job;
    }


    /*Update company with data
    Data can include {title, salary, equity}
    Returns {title, salary, equity} */
    static async update(id, data) {
        const jsonToSQL = {
            title: "title",
            salary: "salary",
            equity: "equity"
        }
        const {setCols, values } = sqlForPartialUpdate(data, jsonToSQL);

        const handleVarIdx = "$" + (values.length + 1);

        const querySql = `UPDATE jobs
                        SET ${setCols}
                        WHERE id = ${handleVarIdx}
                        RETURNING title, salary, equity, company_handle`;
        const result = await db.query(querySql, [...values, id]);
        const job = result.rows[0];

        if(!job) throw new NotFoundError(`No job with id ${id}`);

        return job;
    }

    /*Delete job 
    returns undefined.
    Throws NotFoundError if company not found.*/
    static async remove(id){
        const result = await db.query(
            `DELETE FROM jobs
            WHERE id=$1
            RETURNING id`,
            [id]
        );
        const job = result.rows[0];
        if(!job) throw new NotFoundError(`No job with id ${id}`);
    }
}

module.exports = Job;
