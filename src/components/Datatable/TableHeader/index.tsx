import { FC } from 'react';
import { Icon } from '@iconify/react';
import { ITableHeaderProps } from '../types';

const CENTERED_KEYS = new Set(['estado', 'tipo', 'status', 'acciones']);

const TableHeader: FC<ITableHeaderProps> = ({ columns, onSort, actions }) => {
    return (
        <thead className="bg-transparent">
            <tr>
                {columns.map((column) => {
                    const isObject = typeof column === 'object';
                    const key = isObject ? column.key : (column as string);
                    const label = isObject ? column.label : (column as string);
                    const centered = CENTERED_KEYS.has(key.toLowerCase());
                    return (
                        <th
                            key={key}
                            onClick={() => onSort(key)}
                            style={{ textAlign: centered ? 'center' : 'left' }}
                            className="group select-none"
                        >
                            <span className="inline-flex items-center gap-1 group-hover:text-gray-600 transition-colors">
                                {label}
                                <Icon
                                    icon="solar:alt-arrow-down-linear"
                                    className="text-[10px] opacity-0 group-hover:opacity-60 transition-opacity"
                                />
                            </span>
                        </th>
                    );
                })}
                {actions && actions.length > 0 && (
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                )}
            </tr>
        </thead>
    );
};

export default TableHeader;
