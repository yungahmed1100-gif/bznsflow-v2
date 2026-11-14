/**
 * Tables are the honest way to present "who else sees your data": prose hides how many parties
 * there are. The wrapper scrolls on a narrow screen instead of the whole page, and is a named,
 * focusable region so keyboard users can scroll it too.
 * @param {{ rows: string[][], head: string[], label: string }} props
 */
export function LegalTable({ rows, head, label }) {
  return (
    <div className="legal-table-wrap" tabIndex={0} role="region" aria-label={label}>
      <table className="legal-table">
        <thead>
          <tr>
            {head.map(heading => (
              <th key={heading} scope="col">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row[0]}>
              {row.map((cell, index) =>
                index === 0 ? (
                  <th key={cell} scope="row">
                    <bdi>{cell}</bdi>
                  </th>
                ) : (
                  <td key={cell}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
