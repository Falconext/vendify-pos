import { useRef, useState, useEffect } from 'react';
import styles from './autoScrollTable.module.css';
import { Icon } from '@iconify/react';

interface AutoScrollTableProps {
    children: React.ReactNode;
}

const AutoScrollTable = ({
    children,
}: AutoScrollTableProps) => {
    const tableContainerRef = useRef<HTMLDivElement>(null);

    const jumpToEnd = () => {
        if (!tableContainerRef.current) return;
        const { scrollWidth, clientWidth } = tableContainerRef.current;
        tableContainerRef.current.scrollTo({ left: Math.max(0, scrollWidth - clientWidth), behavior: 'auto' });
    };

    const jumpToStart = () => {
        if (!tableContainerRef.current) return;
        tableContainerRef.current.scrollTo({ left: 0, behavior: 'auto' });
    };

    const [hasOverflow, setHasOverflow] = useState(false);

    const checkOverflow = () => {
        if (tableContainerRef.current) {
            const { scrollWidth, clientWidth } = tableContainerRef.current;
            setHasOverflow(scrollWidth > clientWidth);
        }
    };

    useEffect(() => {
        checkOverflow();
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
    }, [children]);

    // Si ya no hay overflow, normalizar posición horizontal.
    useEffect(() => {
        if (!hasOverflow && tableContainerRef.current) {
            tableContainerRef.current.scrollTo({ left: 0, behavior: 'auto' });
        }
    }, [hasOverflow]);

    return (
        <div className={styles.autoScrollTable}>
            {hasOverflow && (
                <div className="flex justify-end items-center gap-2 px-4 py-0 pb-2 rounded-t-xl mt-3">
                    <span className="text-xs text-gray-400 font-[400] mr-2">Desplazamiento rápido</span>
                    <button
                        onClick={jumpToStart}
                        className="p-1.5 rounded-lg border border-gray-200 transition-all duration-200 bg-white text-gray-500 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-sm"
                        title="Ir al inicio"
                    >
                        <Icon icon="solar:double-alt-arrow-left-bold-duotone" width={20} height={20} />
                    </button>

                    <button
                        onClick={jumpToEnd}
                        className="p-1.5 rounded-lg border border-gray-200 transition-all duration-200 bg-white text-gray-500 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-sm"
                        title="Ir al final"
                    >
                        <Icon icon="solar:double-alt-arrow-right-bold-duotone" width={20} height={20} />
                    </button>
                </div>
            )}
            <div ref={tableContainerRef} className={styles.tableContainer}>
                {children}
            </div>
        </div>
    );
};

export default AutoScrollTable;
