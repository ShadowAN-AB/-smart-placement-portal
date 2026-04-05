import Badge from './common/Badge';

const toneMap = {
  pending: 'default',
  shortlisted: 'success',
  rejected: 'error',
  interview: 'info',
};

const ApplicationStatusBadge = ({ status }) => {
  return <Badge tone={toneMap[status] || 'default'}>{status || 'pending'}</Badge>;
};

export default ApplicationStatusBadge;
