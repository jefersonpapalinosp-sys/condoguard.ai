import { Navigate, useParams } from 'react-router-dom';
import CadastrosGerais from '../../../views/CadastrosGerais';
import { CADASTROS_DEFAULT_SLUG, isCadastrosTabSlug } from '../constants/cadastrosTabs';

export default function CadastrosGeraisPage() {
  const { tipoSlug } = useParams<{ tipoSlug: string }>();
  const slug = tipoSlug ?? CADASTROS_DEFAULT_SLUG;

  if (!isCadastrosTabSlug(slug)) {
    return <Navigate to={`/cadastros-gerais/${CADASTROS_DEFAULT_SLUG}`} replace />;
  }

  return <CadastrosGerais activeTabSlug={slug} />;
}
