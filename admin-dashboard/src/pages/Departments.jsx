import styles from './Departments.module.css';

export default function Departments() {
  return (
    <div className={styles.page}>
      <div className={styles.unavailable} role="note">
        <h2 className={styles.unavailableTitle}>Department management is unavailable</h2>
        <p>
          The backend currently exposes no department list, detail, create, update,
          or delete endpoints. It also has no department records or category-to-
          department mapping. This page does not display sample departments or
          claim that changes are saved.
        </p>
        <h3>Backend support needed</h3>
        <ul>
          <li>
            Persistent department records with an ID, name, short code, supported
            categories, and optional contact details.
          </li>
          <li>
            Department CRUD endpoints, for example
            {' '}<code>/api/v1/departments</code> and
            {' '}<code>/api/v1/departments/{'{department_id}'}</code>, with documented
            request and response schemas.
          </li>
          <li>
            A persisted issue-to-department assignment field and an assignment
            update endpoint or documented issue update contract.
          </li>
          <li>
            A clear rule for deriving department active and resolved complaint
            counts from assigned issues.
          </li>
        </ul>
      </div>
    </div>
  );
}
