import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import {
    ProductosVendidosResponse,
    formatFecha,
    formatPct,
    formatSoles,
    formatUnidades,
} from './ProductosModel';

Font.register({
    family: 'Roboto',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf', fontWeight: 'normal' },
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc9.ttf', fontWeight: 'bold' },
    ],
});

const styles = StyleSheet.create({
    page: { fontFamily: 'Roboto', fontSize: 8, color: '#111827', padding: 32, backgroundColor: '#fff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 2, borderBottomColor: '#111827', paddingBottom: 12, marginBottom: 14 },
    title: { fontSize: 16, fontWeight: 'bold' },
    subtitle: { fontSize: 8, color: '#6b7280', marginTop: 3 },
    company: { fontSize: 9, fontWeight: 'bold', textAlign: 'right' },
    meta: { fontSize: 7, color: '#6b7280', textAlign: 'right', marginTop: 2 },
    kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    kpi: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 4, padding: 9 },
    kpiLabel: { fontSize: 7, color: '#6b7280', marginBottom: 4 },
    kpiValue: { fontSize: 12, fontWeight: 'bold' },
    kpiSub: { fontSize: 7, color: '#6b7280', marginTop: 3 },
    section: { fontSize: 9, fontWeight: 'bold', marginTop: 10, marginBottom: 6, textTransform: 'uppercase' },
    tableHeader: { flexDirection: 'row', backgroundColor: '#111827', paddingVertical: 5, paddingHorizontal: 6 },
    th: { color: '#fff', fontSize: 7, fontWeight: 'bold' },
    row: { flexDirection: 'row', paddingVertical: 4, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
    alt: { backgroundColor: '#fafafa' },
    totalRow: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: '#111827', backgroundColor: '#f3f4f6' },
    cell: { fontSize: 7, color: '#374151' },
    bold: { fontWeight: 'bold', color: '#111827' },
    // Ranking de productos
    prod: { width: '28%' },
    cat: { width: '14%' },
    units: { width: '9%', textAlign: 'right' },
    price: { width: '11%', textAlign: 'right' },
    income: { width: '13%', textAlign: 'right' },
    profit: { width: '13%', textAlign: 'right' },
    margin: { width: '7%', textAlign: 'right' },
    share: { width: '5%', textAlign: 'right' },
    // Acumulado por día
    dDate: { width: '20%' },
    dUnits: { width: '14%', textAlign: 'right' },
    dValue: { width: '22%', textAlign: 'right' },
    footer: { position: 'absolute', bottom: 20, left: 32, right: 32, borderTopWidth: 1, borderTopColor: '#d1d5db', paddingTop: 5, flexDirection: 'row', justifyContent: 'space-between' },
    footerText: { fontSize: 7, color: '#9ca3af' },
});

const MAX_PRODUCTOS = 60;

export function ProductosReportPDF({
    data,
    empresa,
}: {
    data: ProductosVendidosResponse;
    empresa: { nombre?: string; ruc?: string; direccion?: string } | null;
}) {
    const now = new Date().toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' });

    // El PDF muestra el acumulado: cada día trae el corrido del período.
    let accIngreso = 0;
    let accGanancia = 0;
    let accUnidades = 0;
    const diasAcumulados = data.serieDiaria
        .filter((d) => d.unidades !== 0 || d.ingreso !== 0)
        .map((d) => {
            accIngreso += d.ingreso;
            accGanancia += d.ganancia;
            accUnidades += d.unidades;
            return {
                fecha: d.fecha,
                unidades: d.unidades,
                ingreso: d.ingreso,
                accUnidades,
                accIngreso,
                accGanancia,
            };
        });

    return (
        <Document title="Ventas por producto" author={empresa?.nombre}>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Ventas por producto</Text>
                        <Text style={styles.subtitle}>Productos vendidos y acumulado por día</Text>
                    </View>
                    <View>
                        <Text style={styles.company}>{empresa?.nombre ?? 'Empresa'}</Text>
                        {empresa?.ruc && <Text style={styles.meta}>RUC: {empresa.ruc}</Text>}
                        <Text style={styles.meta}>Periodo: {data.periodo.label}</Text>
                        <Text style={styles.meta}>Generado: {now}</Text>
                    </View>
                </View>

                <View style={styles.kpiRow}>
                    <View style={styles.kpi}>
                        <Text style={styles.kpiLabel}>UNIDADES VENDIDAS</Text>
                        <Text style={styles.kpiValue}>{formatUnidades(data.resumen.unidadesVendidas)}</Text>
                    </View>
                    <View style={styles.kpi}>
                        <Text style={styles.kpiLabel}>VENTAS</Text>
                        <Text style={styles.kpiValue}>{formatSoles(data.resumen.ventasConIgv ?? data.resumen.ingresoTotal)}</Text>
                        <Text style={styles.kpiSub}>sin IGV {formatSoles(data.resumen.ingresoTotal)}</Text>
                    </View>
                    <View style={styles.kpi}>
                        <Text style={styles.kpiLabel}>GANANCIA</Text>
                        <Text style={styles.kpiValue}>{formatSoles(data.resumen.gananciaTotal)}</Text>
                    </View>
                    <View style={styles.kpi}>
                        <Text style={styles.kpiLabel}>MARGEN PROMEDIO</Text>
                        <Text style={styles.kpiValue}>{formatPct(data.resumen.margenPromedio)}</Text>
                    </View>
                </View>

                <Text style={styles.section}>Ranking de productos</Text>
                <View style={styles.tableHeader}>
                    <Text style={[styles.th, styles.prod]}>Producto</Text>
                    <Text style={[styles.th, styles.cat]}>Categoría</Text>
                    <Text style={[styles.th, styles.units]}>Unid.</Text>
                    <Text style={[styles.th, styles.price]}>P. prom.</Text>
                    <Text style={[styles.th, styles.income]}>Ingreso s/IGV</Text>
                    <Text style={[styles.th, styles.profit]}>Ganancia</Text>
                    <Text style={[styles.th, styles.margin]}>Mrg.</Text>
                    <Text style={[styles.th, styles.share]}>%</Text>
                </View>
                {data.productos.slice(0, MAX_PRODUCTOS).map((p, idx) => (
                    <View key={`${p.productoId ?? 'srv'}-${p.nombre}`} style={[styles.row, idx % 2 ? styles.alt : {}]}>
                        <Text style={[styles.cell, styles.prod]}>{p.codigo ? `${p.codigo} · ` : ''}{p.nombre}</Text>
                        <Text style={[styles.cell, styles.cat]}>{p.categoria}</Text>
                        <Text style={[styles.cell, styles.units]}>{formatUnidades(p.unidadesVendidas)}</Text>
                        <Text style={[styles.cell, styles.price]}>{formatSoles(p.precioPromedio)}</Text>
                        <Text style={[styles.cell, styles.income, styles.bold]}>{formatSoles(p.ingresoTotal)}</Text>
                        <Text style={[styles.cell, styles.profit, styles.bold]}>{formatSoles(p.gananciaTotal)}</Text>
                        <Text style={[styles.cell, styles.margin]}>{formatPct(p.margen)}</Text>
                        <Text style={[styles.cell, styles.share]}>{formatPct(p.participacion)}</Text>
                    </View>
                ))}
                <View style={styles.totalRow}>
                    <Text style={[styles.cell, styles.bold, styles.prod]}>TOTAL</Text>
                    <Text style={[styles.cell, styles.cat]}>{data.resumen.totalProductos} producto(s)</Text>
                    <Text style={[styles.cell, styles.bold, styles.units]}>{formatUnidades(data.resumen.unidadesVendidas)}</Text>
                    <Text style={[styles.cell, styles.price]}>-</Text>
                    <Text style={[styles.cell, styles.bold, styles.income]}>{formatSoles(data.resumen.ingresoTotal)}</Text>
                    <Text style={[styles.cell, styles.bold, styles.profit]}>{formatSoles(data.resumen.gananciaTotal)}</Text>
                    <Text style={[styles.cell, styles.bold, styles.margin]}>{formatPct(data.resumen.margenPromedio)}</Text>
                    <Text style={[styles.cell, styles.share]}>100%</Text>
                </View>
                {data.productos.length > MAX_PRODUCTOS && (
                    <View style={styles.row}>
                        <Text style={styles.cell}>
                            Se muestran los {MAX_PRODUCTOS} productos con mayor ingreso de {data.productos.length}. El total incluye todos.
                        </Text>
                    </View>
                )}

                <Text style={styles.section} break>Acumulado por día</Text>
                <View style={styles.tableHeader}>
                    <Text style={[styles.th, styles.dDate]}>Fecha</Text>
                    <Text style={[styles.th, styles.dUnits]}>Unid. día</Text>
                    <Text style={[styles.th, styles.dValue]}>Ingreso día</Text>
                    <Text style={[styles.th, styles.dUnits]}>Unid. acum.</Text>
                    <Text style={[styles.th, styles.dValue]}>Ingreso acum.</Text>
                    <Text style={[styles.th, styles.dValue]}>Ganancia acum.</Text>
                </View>
                {diasAcumulados.map((d, idx) => (
                    <View key={d.fecha} style={[styles.row, idx % 2 ? styles.alt : {}]}>
                        <Text style={[styles.cell, styles.dDate]}>{formatFecha(d.fecha)}</Text>
                        <Text style={[styles.cell, styles.dUnits]}>{formatUnidades(d.unidades)}</Text>
                        <Text style={[styles.cell, styles.dValue]}>{formatSoles(d.ingreso)}</Text>
                        <Text style={[styles.cell, styles.dUnits, styles.bold]}>{formatUnidades(d.accUnidades)}</Text>
                        <Text style={[styles.cell, styles.dValue, styles.bold]}>{formatSoles(d.accIngreso)}</Text>
                        <Text style={[styles.cell, styles.dValue, styles.bold]}>{formatSoles(d.accGanancia)}</Text>
                    </View>
                ))}
                {diasAcumulados.length === 0 && (
                    <View style={styles.row}>
                        <Text style={styles.cell}>Sin movimiento diario en el período.</Text>
                    </View>
                )}

                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>Falconext · Finanzas</Text>
                    <Text style={styles.footerText}>Reporte de ventas por producto</Text>
                </View>
            </Page>
        </Document>
    );
}
