import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  integer,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$default(() => randomUUID()),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  ...timestamps,
});

export const jobStatus = ["active", "inactive"] as const;
export const jobStatusEnum = pgEnum("job_status", jobStatus);

export const jobs = pgTable(
  "jobs",
  {
    id: text("id")
      .primaryKey()
      .$default(() => randomUUID()),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    status: jobStatusEnum("status").default("active").notNull(),
    keywords: text("keywords").array(),
    salary: integer("salary").notNull().default(0),
    userId: text("user_id")
      .references(() => users.id)
      .notNull(),
    ...timestamps,
  },
  /*
   * https://orm.drizzle.team/docs/guides/postgresql-full-text-search

  * A Generalized Inverted Index (GIN) is a type of index in PostgreSQL 
  * that's designed to handle data types with multiple component values:
  * Arrays, Full-text search vectors, JSONB (binary JSON), and hstore (key-value pairs)
   */
  (table) => [
    index("search_index").using(
      "gin",
      sql`(
          setweight(to_tsvector('english', ${table.title}), 'A') ||
          setweight(to_tsvector('english', ${table.description}), 'B')
      )`
    ),
  ]
);

export const applicationStatus = ["pending", "accepted", "rejected"] as const;
export const applicationStatusEnum = pgEnum(
  "application_status",
  applicationStatus
);

export const applications = pgTable("applications", {
  id: text("id")
    .primaryKey()
    .$default(() => randomUUID()),
  jobId: text("job_id")
    .references(() => jobs.id)
    .notNull(),
  userId: text("user_id")
    .references(() => users.id)
    .notNull(),
  coverLetter: text("cover_letter").notNull(),
  resume: text("resume").notNull(),
  status: applicationStatusEnum("status").default("pending").notNull(),
  ...timestamps,
});
