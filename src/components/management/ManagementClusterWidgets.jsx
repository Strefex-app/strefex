import Icon from '../Icon'

export default function ManagementClusterWidgets({ clusters, onNavigate }) {
  return (
    <div className="mgmt-cluster-widgets">
      {clusters.map((cluster) => (
        <button
          key={cluster.id}
          type="button"
          className="mgmt-cluster-widget stx-click-feedback"
          onClick={() => onNavigate(cluster.path)}
        >
          <div
            className="mgmt-cluster-widget__icon"
            style={{ background: `${cluster.color}18`, color: cluster.color }}
          >
            <Icon name={cluster.icon} size={26} />
          </div>
          <div className="mgmt-cluster-widget__body min-width-0">
            <div className="mgmt-cluster-widget__title">{cluster.label}</div>
            <p className="mgmt-cluster-widget__desc stx-text-wrap">{cluster.description}</p>
            {cluster.meta?.length ? (
              <div className="mgmt-cluster-widget__meta">
                {cluster.meta.flatMap((piece, index) => {
                  const nodes = []
                  if (index > 0) {
                    nodes.push(<span key={`${cluster.id}-dot-${piece}`} aria-hidden>·</span>)
                  }
                  nodes.push(<span key={`${cluster.id}-meta-${piece}`}>{piece}</span>)
                  return nodes
                })}
              </div>
            ) : null}
            {cluster.stats?.length ? (
              <div className="mgmt-cluster-widget__stats">
                {cluster.stats.slice(0, 2).map((stat) => (
                  <span key={stat.label} className="mgmt-cluster-widget__chip">
                    <strong>{stat.value}</strong>
                    {' '}
                    {stat.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="mgmt-cluster-widget__arrow" aria-hidden>
            <Icon name="chevron-right" size={22} />
          </div>
        </button>
      ))}
    </div>
  )
}
