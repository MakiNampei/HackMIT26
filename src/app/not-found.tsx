import Link from "next/link";

export default function NotFound() {
  return (
    <section className="card" style={{ margin: "10vh auto", maxWidth: 560, textAlign: "center" }}>
      <p className="eyebrow">404</p>
      <h1>Session not found</h1>
      <p className="subtle">This mock session may have disappeared after the development server restarted.</p>
      <Link className="button" href="/dashboard">Back to dashboard</Link>
    </section>
  );
}
