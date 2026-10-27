import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { EventEmitter } from 'node:events';

type PuertoFalso = {
  opciones: { path: string; baudRate: number };
  parser: EventEmitter;
  escrituras: string[];
  cerrado: boolean;
};

const URL_API: string = 'https://proyectos-tic.ort.edu.ar/trinity/api/respuesta';
const RESPUESTA_API: string = '0986d4ed';

vi.mock('serialport', async () => {
  const { EventEmitter } = await import('node:events');
  class ReadlineParser extends EventEmitter {}
  class SerialPort {
    static ultimo: SerialPort | undefined;
    parser: EventEmitter = new EventEmitter();
    escrituras: string[] = [];
    cerrado: boolean = false;
    constructor(public opciones: { path: string; baudRate: number }) {
      SerialPort.ultimo = this;
    }
    pipe(parser: EventEmitter): EventEmitter {
      this.parser = parser;
      return parser;
    }
    write(mensaje: string): boolean {
      this.escrituras.push(mensaje);
      return true;
    }
    close(): void {
      this.cerrado = true;
    }
  }
  return { SerialPort, ReadlineParser };
});

describe('Trinity', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let fetchFalso: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    vi.resetModules();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    fetchFalso = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(JSON.stringify({ respuesta: RESPUESTA_API }))),
    );
    vi.stubGlobal('fetch', fetchFalso);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  async function cargar(): Promise<PuertoFalso> {
    await import('../src/index.ts');
    const { SerialPort }: typeof import('serialport') = await import('serialport');
    return (SerialPort as unknown as { ultimo: PuertoFalso }).ultimo;
  }

  // La placa "habla": el parser entrega una línea por vez
  function hablar(puerto: PuertoFalso, mensaje: object): void {
    puerto.parser.emit('data', JSON.stringify(mensaje));
  }

  function enviado(puerto: PuertoFalso, indice: number): unknown {
    const linea: string = puerto.escrituras[indice];
    expect(linea.endsWith('\n')).toBe(true);
    const objeto: unknown = JSON.parse(linea);
    return objeto;
  }

  it('abre el puerto de la placa a 115200 baudios', async () => {
    const puerto: PuertoFalso = await cargar();
    expect(puerto.opciones.baudRate).toBe(115200);
    expect(puerto.opciones.path).not.toBe('');
  });

  it('cuando la placa está disponible, le envía su DNI como texto de 4 dígitos', async () => {
    const puerto: PuertoFalso = await cargar();
    hablar(puerto, { tipo: 'disponible' });
    expect(puerto.escrituras).toHaveLength(1);
    const dni: unknown = (enviado(puerto, 0) as { dni: unknown }).dni;
    expect(dni).toMatch(/^\d{4}$/);
  });

  it('ante un desafío, le pide la respuesta a la API con el mismo DNI y el nonce', async () => {
    const puerto: PuertoFalso = await cargar();
    hablar(puerto, { tipo: 'disponible' });
    const { dni }: { dni: string } = enviado(puerto, 0) as { dni: string };
    hablar(puerto, { tipo: 'desafio', nonce: 483921 });
    await vi.waitFor(() => expect(fetchFalso).toHaveBeenCalledTimes(1));
    const [url, opciones]: Parameters<typeof fetch> = fetchFalso.mock.calls[0];
    expect(String(url)).toBe(URL_API);
    expect(opciones?.method).toBe('POST');
    expect(new Headers(opciones?.headers).get('content-type')).toBe('application/json');
    expect(JSON.parse(String(opciones?.body))).toEqual({ dni, nonce: 483921 });
  });

  it('le envía a la placa la respuesta que dio la API', async () => {
    const puerto: PuertoFalso = await cargar();
    hablar(puerto, { tipo: 'disponible' });
    hablar(puerto, { tipo: 'desafio', nonce: 483921 });
    await vi.waitFor(() => expect(puerto.escrituras).toHaveLength(2));
    expect(enviado(puerto, 1)).toEqual({ respuesta: RESPUESTA_API });
  });

  it('si el resultado es correcto, muestra true y cierra el puerto', async () => {
    const puerto: PuertoFalso = await cargar();
    hablar(puerto, { tipo: 'resultado', ok: true });
    expect(consoleSpy).toHaveBeenCalledWith(true);
    expect(puerto.cerrado).toBe(true);
  });

  it('si el resultado es incorrecto, muestra false y cierra el puerto', async () => {
    const puerto: PuertoFalso = await cargar();
    hablar(puerto, { tipo: 'resultado', ok: false });
    expect(consoleSpy).toHaveBeenCalledWith(false);
    expect(puerto.cerrado).toBe(true);
  });
});
