import { FC, useState, useEffect, useMemo } from 'react';
import { Icon } from '@iconify/react';
import TableHeader from './TableHeader';
import TableBody from './TableBody';
import { IDataTableProps } from './types';
import styles from './table.module.css';
import AutoScrollTable from '../Autoscrolltable';
import { AnimatePresence, motion } from 'framer-motion';
import { fadeUp, interactiveHover } from '@/lib/motion/presets';

const DataTable: FC<IDataTableProps> = ({
    formValues,
    headerColumns,
    bodyData,
    color,
    idTable,
    colorFont,
    colorRow,
    actions,
    isCompact,
    pageSize,
}: any) => {
    const [data, setData] = useState(Array.isArray(bodyData) ? bodyData : []);
    const [currentPage, setCurrentPage] = useState(1);

    const resolvedColumns = useMemo(() => {
        if (!Array.isArray(headerColumns)) return headerColumns;

        const rows = Array.isArray(bodyData) ? bodyData : [];
        const sample = rows.length > 0 ? rows[0] : undefined;
        if (!sample || typeof sample !== 'object') return headerColumns;

        const sampleKeys = Object.keys(sample);

        const normalize = (value: string) =>
            value.toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

        const aliases: Record<string, string[]> = {
            nro: ['correlativo', 'numero', 'nro', 'nrodoc', 'numdoc'],
            ot: ['numeroot', 'numeroordentrabajo', 'ordentrabajo', 'ot'],
            producto: ['descripcion', 'producto'],
            unimed: ['unidadmedida', 'unidad'],
            pu: ['preciounitario', 'precio'],
            venta: ['sale', 'venta'],
            importe: ['total', 'monto', 'mtoimpventa', 'importe'],
            nrodocumento: ['ruc', 'nrodoc', 'numdoc', 'document', 'documento'],
            opergravada: ['montogravadas', 'mtoopergravadas', 'mtoopergravada', 'opergravada', 'gravadas', 'gravada'],
            igv: ['montoigv', 'mtoigv', 'igv'],
            docafiliado: ['documentoafiliado', 'numdocafectado', 'documentoafectado'],
            numdoc: ['document', 'nrodoc', 'numdoc'],
        };

        const resolveKey = (label: string) => {
            if (Object.prototype.hasOwnProperty.call(sample, label)) return label;
            const labelNorm = normalize(label);
            const exactNorm = sampleKeys.find((k) => normalize(k) === labelNorm);
            if (exactNorm) return exactNorm;
            const aliasList = aliases[labelNorm];
            if (aliasList) {
                for (const aliasNorm of aliasList) {
                    const match = sampleKeys.find((k) => normalize(k) === aliasNorm);
                    if (match) return match;
                }
            }
            const minLen = 4;
            if (labelNorm.length >= minLen) {
                const fuzzy = sampleKeys.find((k) => {
                    const nk = normalize(k);
                    const shortLen = Math.min(nk.length, labelNorm.length);
                    if (shortLen < minLen) return false;
                    return nk.includes(labelNorm) || labelNorm.includes(nk);
                });
                if (fuzzy) return fuzzy;
            }
            return label;
        };

        return headerColumns.map((col: any) => {
            if (typeof col === 'object' && col && 'key' in col && 'label' in col) return col;
            const label = col as string;
            return { label, key: resolveKey(label) };
        });
    }, [headerColumns, bodyData]);

    const safeResolvedColumns = useMemo(() => {
        if (Array.isArray(resolvedColumns) && resolvedColumns.length > 0) return resolvedColumns;
        const sample = Array.isArray(bodyData) && bodyData.length > 0 ? bodyData[0] : null;
        if (!sample || typeof sample !== 'object') return [];
        const fallbackKeys = ['Producto', 'Precio Venta', 'Stock', 'Estado', 'Acciones'];
        return fallbackKeys
            .filter((key) => Object.prototype.hasOwnProperty.call(sample, key))
            .map((key) => ({ label: key, key }));
    }, [resolvedColumns, bodyData]);

    useEffect(() => {
        const nextData = Array.isArray(bodyData) ? bodyData : [];
        setData(nextData);
        setCurrentPage(1);
    }, [bodyData]);

    const handleSort = (column: string) => {
        const sortedData = [...data].sort((a, b) => (a[column] > b[column] ? 1 : -1));
        setData(sortedData);
        setCurrentPage(1);
    };

    // ── Pagination ──────────────────────────────────────────────────
    const totalItems = data?.length ?? 0;
    const totalPages = pageSize && pageSize > 0 ? Math.ceil(totalItems / pageSize) : 1;
    const paginatedData = pageSize && pageSize > 0
        ? (data ?? []).slice((currentPage - 1) * pageSize, currentPage * pageSize)
        : data;

    const getPageNumbers = () => {
        if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
        const pages: (number | '...')[] = [];
        const delta = 2;
        const left = Math.max(2, currentPage - delta);
        const right = Math.min(totalPages - 1, currentPage + delta);
        pages.push(1);
        if (left > 2) pages.push('...');
        for (let i = left; i <= right; i++) pages.push(i);
        if (right < totalPages - 1) pages.push('...');
        pages.push(totalPages);
        return pages;
    };

    const renderPagination = () => {
        if (!pageSize || totalPages <= 1) return null;
        const start = (currentPage - 1) * pageSize + 1;
        const end = Math.min(currentPage * pageSize, totalItems);

        return (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-slate-800">
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                    Mostrando <span className="text-gray-600 dark:text-gray-300 font-semibold">{start}</span> a{' '}
                    <span className="text-gray-600 dark:text-gray-300 font-semibold">{end}</span> de{' '}
                    <span className="text-gray-600 dark:text-gray-300 font-semibold">{totalItems}</span> registros
                </p>
                <div className="flex items-center gap-1">
                    <motion.button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        whileHover={interactiveHover.whileHover}
                        whileTap={interactiveHover.whileTap}
                    >
                        <Icon icon="solar:alt-arrow-left-linear" className="text-sm" />
                    </motion.button>

                    {getPageNumbers().map((page, idx) =>
                        page === '...' ? (
                            <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">
                                ···
                            </span>
                        ) : (
                            <motion.button
                                key={page}
                                onClick={() => setCurrentPage(page as number)}
                                className={`w-8 h-8 rounded-lg text-sm font-semibold transition-all ${
                                    page === currentPage
                                        ? 'bg-violet-600 text-white shadow-sm shadow-violet-200'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                                }`}
                                whileHover={interactiveHover.whileHover}
                                whileTap={interactiveHover.whileTap}
                            >
                                {page}
                            </motion.button>
                        )
                    )}

                    <motion.button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        whileHover={interactiveHover.whileHover}
                        whileTap={interactiveHover.whileTap}
                    >
                        <Icon icon="solar:alt-arrow-right-linear" className="text-sm" />
                    </motion.button>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col">
            <AutoScrollTable>
                <div className="px-4 w-max min-w-full">
                    {data?.length > 0 && safeResolvedColumns.length > 0 ? (
                        <AnimatePresence mode="sync">
                            <motion.table
                                key={`table-${currentPage}`}
                                className={`${styles.table} ${isCompact ? styles.compact : ''} w-full`}
                                id={idTable}
                                layout
                                variants={fadeUp}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                            >
                                <TableHeader
                                    columns={safeResolvedColumns}
                                    colorFont={colorFont}
                                    onSort={handleSort}
                                    actions={actions}
                                />
                                <TableBody
                                    formValues={formValues}
                                    data={paginatedData}
                                    colorRow={colorRow}
                                    colorFont={colorFont}
                                    actions={actions}
                                    columns={safeResolvedColumns}
                                />
                            </motion.table>
                        </AnimatePresence>
                    ) : (
                        <motion.div className="flex flex-col items-center justify-center py-20 text-gray-400" variants={fadeUp} initial="initial" animate="animate" exit="exit">
                            <div className="bg-white/50 dark:bg-slate-800/50 p-6 rounded-full mb-4">
                                <Icon icon="solar:box-minimalistic-linear" className="text-6xl text-gray-300" />
                            </div>
                            <h3 className="text-lg font-medium text-[#8C8B88] mb-1">
                                {data?.length > 0 ? 'No se pudieron renderizar las columnas' : 'No se encontraron registros'}
                            </h3>
                            <p className="text-sm text-[#A09F9B] text-center">
                                {data?.length > 0
                                    ? 'Restauramos una vista segura. Recarga la página para sincronizar columnas.'
                                    : 'Intenta ajustar los filtros o realiza una nueva búsqueda para encontrar lo que necesitas.'}
                            </p>
                        </motion.div>
                    )}
                </div>
            </AutoScrollTable>
            {renderPagination()}
        </div>
    );
};

export default DataTable;
