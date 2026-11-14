import React from 'react';

export function LegalTable({ rows, head, label }) {
  return <div className="legal-table-wrap" tabIndex={0} role="region" aria-label={label}>
    <table className="legal-table">
      <thead><tr>{head.map(heading => <th key={heading} scope="col">{heading}</th>)}</tr></thead>
      <tbody>{rows.map(row => <tr key={row[0]}>{row.map((cell, index) => index === 0
        ? <th key={cell} scope="row"><bdi>{cell}</bdi></th>
        : <td key={cell}>{cell}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}
