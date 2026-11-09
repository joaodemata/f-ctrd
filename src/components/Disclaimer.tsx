import { t } from '../i18n/language';

// Aviso legal al pie de todas las paginas: la informacion es orientativa y el usuario responde por sus operaciones
export function Disclaimer() {
  return (
    <footer className="disclaimer">
      <p>
        <strong>{t('Aviso:', 'Notice:')}</strong>{' '}
        {t(
          'la información de seedwise.io (oportunidades, calendario económico y datos de mercado) es solo informativa y no constituye asesoramiento financiero ni una recomendación de compra o venta. No nos hacemos responsables de las operaciones que realices ni de sus resultados, sean ganancias o pérdidas. Operar en los mercados conlleva riesgo de pérdida.',
          'the information on seedwise.io (opportunities, economic calendar and market data) is for information only and is not financial advice or a recommendation to buy or sell. We are not responsible for the trades you make or their results, whether gains or losses. Trading in the markets carries a risk of loss.',
        )}
      </p>
    </footer>
  );
}
