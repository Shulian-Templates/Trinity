import { SerialPort, ReadlineParser } from 'serialport';

const API: string = 'https://proyectos-tic.ort.edu.ar/trinity/api/respuesta';
const dni: string = ''; // COMPLETAR: los últimos 4 dígitos de tu DNI, como texto

type Mensaje = { tipo: string; nonce?: number; ok?: boolean; detalle?: string };

// COMPLETAR
