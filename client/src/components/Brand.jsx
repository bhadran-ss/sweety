import { Link } from "react-router";

export default function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Sweety home">
      <img src="/favicon.svg" width="38" height="38" alt="" />
      <span>
        sweety<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
