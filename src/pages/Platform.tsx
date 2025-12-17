interface FeatureProps {
  compact?: boolean;
}

const FeatureGrid = ({ compact }: FeatureProps) => {
  const features = [
    {
      title: 'Universal build',
      detail: 'Vite + TypeScript frontend builds to static assets with a single command.',
    },
    {
      title: 'Tiny API layer',
      detail: 'Express server proxies health checks and serves the compiled UI without extra middleware.',
    },
    {
      title: 'Stateless by default',
      detail: 'No database or session requirement. Plug in your own services when you are ready.',
    },
    {
      title: 'Docker-native',
      detail: 'Multi-stage image ships both API and static assets. Works on any container host.',
    },
    {
      title: 'Zero vendor lock-in',
      detail: 'Everything runs on plain Node.js. Deploy to a VM, container platform, or static host.',
    },
    {
      title: 'Prewired routing',
      detail: 'React Router provides clean navigation with only three core pages to start from.',
    },
  ];

  return (
    <section className={`feature-grid ${compact ? 'compact' : ''}`}>
      <div className="container">
        <p className="eyebrow">Platform</p>
        <h2>Small surface area, high portability</h2>
        <div className="grid">
          {features.map((feature) => (
            <article key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureGrid;
