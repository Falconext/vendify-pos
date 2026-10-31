import { useEffect, useState } from 'react';
import { CSSProperties } from 'styled-components';
import useOutsideClick from "../../hooks/useOutsideClick";
import styles from './select.module.css';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react/dist/iconify.js';
import InputPro from '../InputPro';

interface IProps {
    options: IUbigeum[]
    onChange: any
    isLabel?: boolean
    isSearch?: boolean
    value?: string
    placeholder?: string
    menuLeft?: boolean
    optionSelect?: boolean
    disabled?: boolean
    name: string
    id?: string
    setNameSelect?: any
    setLabel?: any
    withLabel?: boolean
    label?: string
    defaultValue?: string
    left?: boolean
    top?: boolean
    right?: boolean
}

interface IUbigeum {
    codigo: number
    departamento: string
    distrito: string
    provincia: string
    estado: boolean
    codigoDepartamento: string
    codigoDistrito: string
    codigoProvincia: string
}

const SelectUbigeo = ({
    options,
    isSearch,
    disabled,
    label,
    placeholder,
    id,
    name,
    onChange,
    defaultValue,
    left,
    top,
    right,
    value
}: IProps) => {


    const [, setShowOptions] = useState(false);
    const [valueOptions, setValueOptions] = useState<string>(defaultValue || value || "");
    const [search, setSearch] = useState("");
    const [searching,] = useState(!isSearch);
    const [isOpen, setIsOpen, ref] = useOutsideClick(false);


    const heightDropdown: CSSProperties = {
        height: "170px"
    }

    useEffect(() => {
        if (value !== undefined && value !== valueOptions) {
            setValueOptions(value); // Sincronizamos el estado interno con la prop value
            setSearch(""); // Limpiamos la búsqueda para evitar conflictos
        }
    }, [value]);

    const setValueOption = (item: IUbigeum, name: any, id: any) => {

        let div: any = ref.current;
        let inputHtml: any = div.querySelector('input')

        if (search) {
            // @ts-ignore (us this comment if typescript raises an error)
            ref.current.firstChild.firstChild.value = ""
            setValueOptions(`${item.departamento}/${item.provincia}/${item.distrito}`);
            inputHtml.value = "";
            setIsOpen(true)
            onChange(item.codigo, `${item.departamento}/${item.provincia}/${item.distrito}`, name, id);
        } else {
            // @ts-ignore (us this comment if typescript raises an error)
            ref.current.firstChild.firstChild.value = ""
            setIsOpen(true)
            inputHtml.value = "";
            setValueOptions(`${item.departamento}/${item.provincia}/${item.distrito}`);
            onChange(item.codigo, `${item.departamento}/${item.provincia}/${item.distrito}`, name, id);
        }
        setIsOpen(false);
    }

    // Sin tildes ni mayúsculas: "villa maria" encuentra "Villa María del Triunfo".
    const sinTildes = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const results = !search ? options : options.filter((option: IUbigeum) => (typeof option.departamento === "string") && sinTildes(`${option.departamento}/${option.provincia}/${option.distrito}`).includes(sinTildes(search)))

    const searchOptions = (e: any) => {
        // Con un ubigeo ya elegido, lo que se escribe se pegaba al final
        // ("…del Triunfocomas") y la búsqueda no encontraba nada: se busca solo
        // lo nuevo.
        const texto = String(e.target.value ?? '');
        const nuevo = valueOptions && texto.startsWith(valueOptions) ? texto.slice(valueOptions.length) : texto;
        setValueOptions("");
        setShowOptions(true)
        setIsOpen(true)
        setSearch(nuevo);
    }


    return (
        <>
            <div ref={ref} className={styles.wrapper__select}>
                <div className={disabled ? `${styles.input__select} ${styles.disabled__select}` : `${styles.input__select}`} onClick={() => {
                    setIsOpen(!isOpen);
                    // Al entrar se selecciona el texto: escribir reemplaza el ubigeo actual.
                    (ref.current as HTMLElement | null)?.querySelector('input')?.select();
                }}>
                    <div className={styles.selected__valueUbigeo}>
                        {/* {valueOptions && <span className=''>{valueOptions}</span>} */}
                    </div>
                    <div>
                        <InputPro value={valueOptions} isLabel label={label} autocomplete="off" placeholder={placeholder} onChange={searchOptions} name="option"
                        />
                    </div>
                    <div className="absolute z-10 right-5 top-11">
                        <Icon icon="ep:arrow-down-bold" onClick={() => setIsOpen(!isOpen)} />
                    </div>
                </div>

                {isOpen && (
                    <motion.div
                        animate={left ? { x: -140, y: 10 } : top ? { x: 0, y: -250 } : right ? { y: 40 } : { x: 0, y: 10 }}
                        initial={left ? { y: 10, x: -10 } : top ? { x: 0, y: -350 } : right ? { y: 20 } : { y: 40 }}
                        style={heightDropdown} className={styles.content__listOptions}>
                        {
                            results && results.length > 0 && results.map((item: IUbigeum) => (
                                <li key={item.codigo} onClick={() => {
                                    setValueOption(item, name, id)
                                }}>
                                    <p>{`${item.departamento}/${item.provincia}/${item.distrito}`}</p>
                                </li>
                            ))
                        }
                    </motion.div>
                )}

            </div>

        </>
    )
}

export default SelectUbigeo;