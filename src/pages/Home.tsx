import { Link } from 'react-router-dom';
import FeatureGrid from './Platform';

const Home = () => (
  <section className="hero">
    <div className="container">
      <p className="eyebrow">Full reset</p>
      <h1>Clean, portable TreePro experience</h1>
      <p className="lead">
        A fresh React + Express stack with zero baggage. Build, preview, and ship anywhere without custom hosting requirements.
      </p>
      <div className="actions">
        <Link className="cta" to="#deploy">View deployment</Link>
        <Link className="ghost" to="/platform">Explore platform</Link>
      </div>
    </div>
    <FeatureGrid compact />
  </section>
);

export default Home;
