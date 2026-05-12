const DEFAULT_RATIOS = Object.freeze({
  necesidades: 0.5,
  deseos: 0.3,
  ahorro: 0.2,
});

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

function calcularPresupuesto(ingreso, ratios = DEFAULT_RATIOS) {
  const total = Number(ingreso);

  if (!Number.isFinite(total) || total < 0) {
    return {
      ingreso: 0,
      necesidades: 0,
      deseos: 0,
      ahorro: 0,
      usado: 0,
      disponible: 0,
      porcentajeUsado: 0,
    };
  }

  const necesidadesRatio = Number(ratios?.necesidades);
  const deseosRatio = Number(ratios?.deseos);
  const ahorroRatio = Number(ratios?.ahorro);

  const necesidades = roundMoney(
    total * (Number.isFinite(necesidadesRatio) ? necesidadesRatio : DEFAULT_RATIOS.necesidades)
  );
  const deseos = roundMoney(
    total * (Number.isFinite(deseosRatio) ? deseosRatio : DEFAULT_RATIOS.deseos)
  );
  const ahorro = roundMoney(
    total * (Number.isFinite(ahorroRatio) ? ahorroRatio : DEFAULT_RATIOS.ahorro)
  );
  const usado = roundMoney(necesidades + deseos + ahorro);

  return {
    ingreso: roundMoney(total),
    necesidades,
    deseos,
    ahorro,
    usado,
    disponible: roundMoney(total - usado),
    porcentajeUsado: total > 0 ? roundMoney((usado / total) * 100) : 0,
  };
}

function generarResumen(presupuesto) {
  const data =
    presupuesto && typeof presupuesto === 'object' ? presupuesto : calcularPresupuesto(0);
  return `Con $${data.ingreso}:
  $${data.necesidades} para lo esencial,
  $${data.deseos} para gustos,
  y $${data.ahorro} para ahorrar.`;
}

function normalizeBudgetSnapshot(snapshot) {
  if (typeof snapshot === 'number' || typeof snapshot === 'string') {
    return calcularPresupuesto(snapshot);
  }

  const data = snapshot && typeof snapshot === 'object' ? snapshot : {};
  return calcularPresupuesto(data.ingreso, data.ratios || DEFAULT_RATIOS);
}

module.exports = {
  DEFAULT_RATIOS,
  calcularPresupuesto,
  generarResumen,
  normalizeBudgetSnapshot,
};
