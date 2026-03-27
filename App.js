import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';

const STORAGE_KEY = 'ventas_comitrack';
const RUBROS = ['Seguro', 'Inmobiliaria', 'Servicios', 'Otro'];
const FILTROS_RUBRO = ['Todos', 'Seguro', 'Inmobiliaria', 'Servicios', 'Otro'];

const obtenerFechaActual = () => {
  const hoy = new Date();
  const dia = String(hoy.getDate()).padStart(2, '0');
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const anio = hoy.getFullYear();

  return `${dia}/${mes}/${anio}`;
};

export default function App() {
  const [cliente, setCliente] = useState('');
  const [monto, setMonto] = useState('');
  const [porcentaje, setPorcentaje] = useState('');
  const [rubro, setRubro] = useState('Seguro');
  const [filtroRubro, setFiltroRubro] = useState('Todos');
  const [operaciones, setOperaciones] = useState([]);
  const [operacionEnEdicionId, setOperacionEnEdicionId] = useState(null);
  const [yaCargoStorage, setYaCargoStorage] = useState(false);

  useEffect(() => {
    const cargarOperaciones = async () => {
      try {
        const operacionesGuardadas = await AsyncStorage.getItem(STORAGE_KEY);
        console.log('CARGA RAW:', operacionesGuardadas);

        if (operacionesGuardadas) {
          const operacionesParseadas = JSON.parse(operacionesGuardadas);
          console.log('CARGA PARSEADA:', operacionesParseadas);

          if (Array.isArray(operacionesParseadas)) {
            const operacionesConEstado = operacionesParseadas.map((operacion) => ({
              ...operacion,
              estado: operacion.estado === 'Cerrada' ? 'Cerrada' : 'En proceso',
              fechaCreacion: operacion.fechaCreacion || 'Sin fecha',
            }));

            setOperaciones(operacionesConEstado);
          }
        }
      } catch (error) {
        console.log('Error al cargar operaciones:', error);
      } finally {
        console.log('Carga inicial terminada');
        setYaCargoStorage(true);
      }
    };

    cargarOperaciones();
  }, []);

  useEffect(() => {
    if (!yaCargoStorage) return;

    const guardarOperaciones = async () => {
      try {
        console.log('GUARDANDO:', operaciones);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(operaciones));
        const verificacion = await AsyncStorage.getItem(STORAGE_KEY);
        console.log('VERIFICACION GUARDADO:', verificacion);
      } catch (error) {
        console.log('Error al guardar operaciones:', error);
      }
    };

    guardarOperaciones();
  }, [operaciones, yaCargoStorage]);

  const limpiarFormulario = () => {
    setCliente('');
    setMonto('');
    setPorcentaje('');
    setRubro('Seguro');
    setOperacionEnEdicionId(null);
  };

  const obtenerDatosOperacion = () => {
    const clienteLimpio = cliente.trim();
    const montoNumero = parseFloat(monto);
    const porcentajeNumero = parseFloat(porcentaje);

    if (!clienteLimpio || monto.trim() === '' || porcentaje.trim() === '') {
      Alert.alert('Error', 'Todos los campos son obligatorios.');
      return;
    }

    if (isNaN(montoNumero) || isNaN(porcentajeNumero)) {
      Alert.alert('Error', 'Monto y porcentaje deben ser numeros validos.');
      return null;
    }

    const comision = (montoNumero * porcentajeNumero) / 100;

    return {
      cliente: clienteLimpio,
      monto: montoNumero,
      porcentaje: porcentajeNumero,
      comision,
    };
  };

  const agregarOperacion = () => {
    const datosOperacion = obtenerDatosOperacion();

    if (!datosOperacion) {
      return;
    }

    const nuevaOperacion = {
      id: Date.now().toString(),
      ...datosOperacion,
      rubro,
      estado: 'En proceso',
      fechaCreacion: obtenerFechaActual(),
    };

    setOperaciones((prev) => [nuevaOperacion, ...prev]);
    limpiarFormulario();
  };

  const iniciarEdicion = (operacion) => {
    setCliente(operacion.cliente);
    setMonto(operacion.monto.toString());
    setPorcentaje(operacion.porcentaje.toString());
    setRubro(operacion.rubro || 'Seguro');
    setOperacionEnEdicionId(operacion.id);
  };

  const guardarCambios = () => {
    const datosOperacion = obtenerDatosOperacion();

    if (!datosOperacion || !operacionEnEdicionId) {
      return;
    }

    setOperaciones((prev) =>
      prev.map((operacion) => {
        if (operacion.id !== operacionEnEdicionId) {
          return operacion;
        }

        return {
          ...operacion,
          ...datosOperacion,
          rubro,
        };
      })
    );

    limpiarFormulario();
  };

  const cancelarEdicion = () => {
    limpiarFormulario();
  };

  const eliminarOperacion = (idOperacion) => {
    setOperaciones((prev) =>
      prev.filter((operacion) => operacion.id !== idOperacion)
    );
  };

  const cambiarEstadoOperacion = (idOperacion) => {
    setOperaciones((prev) =>
      prev.map((operacion) => {
        if (operacion.id !== idOperacion) return operacion;

        const nuevoEstado =
          operacion.estado === 'En proceso' ? 'Cerrada' : 'En proceso';

        return {
          ...operacion,
          estado: nuevoEstado,
        };
      })
    );
  };

  const totalComisiones = operaciones.reduce(
    (total, operacion) => total + operacion.comision,
    0
  );

  const { totalGanado, totalPotencial } = useMemo(() => {
    const ganado = operaciones
      .filter((operacion) => operacion.estado === 'Cerrada')
      .reduce((total, operacion) => total + operacion.comision, 0);

    const potencial = operaciones
      .filter((operacion) => operacion.estado === 'En proceso')
      .reduce((total, operacion) => total + operacion.comision, 0);

    return {
      totalGanado: ganado,
      totalPotencial: potencial,
    };
  }, [operaciones]);

  const resumenPorRubro = useMemo(() => {
    return operaciones.reduce((acumulado, operacion) => {
      const rubroOperacion = operacion.rubro || 'Sin rubro';

      if (!acumulado[rubroOperacion]) {
        acumulado[rubroOperacion] = 0;
      }

      acumulado[rubroOperacion] += operacion.comision;
      return acumulado;
    }, {});
  }, [operaciones]);

  const cantidadOperacionesPorRubro = useMemo(() => {
    return operaciones.reduce((acumulado, operacion) => {
      const rubroOperacion = operacion.rubro || 'Sin rubro';

      if (!acumulado[rubroOperacion]) {
        acumulado[rubroOperacion] = 0;
      }

      acumulado[rubroOperacion] += 1;
      return acumulado;
    }, {});
  }, [operaciones]);

  const rubrosConResumen = Object.entries(resumenPorRubro);
  const rubroPrincipal =
    rubrosConResumen.length > 0
      ? rubrosConResumen.reduce((rubroMayor, rubroActual) =>
          rubroActual[1] > rubroMayor[1] ? rubroActual : rubroMayor
        )[0]
      : null;

  const operacionesFiltradas =
    filtroRubro === 'Todos'
      ? operaciones
      : operaciones.filter((operacion) => operacion.rubro === filtroRubro);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.metricasContainer}>
        <View style={[styles.tarjetaMetrica, styles.tarjetaGanado]}>
          <Text style={styles.etiquetaMetrica}>Ganado</Text>
          <Text style={styles.valorMetrica}>${totalGanado.toFixed(2)}</Text>
        </View>

        <View style={[styles.tarjetaMetrica, styles.tarjetaPotencial]}>
          <Text style={styles.etiquetaMetrica}>Potencial</Text>
          <Text style={styles.valorMetrica}>${totalPotencial.toFixed(2)}</Text>
        </View>
      </View>

      <Text style={styles.titulo}>ComiTrack</Text>

      <TextInput
        style={styles.input}
        placeholder="Cliente"
        value={cliente}
        onChangeText={setCliente}
      />

      <TextInput
        style={styles.input}
        placeholder="Monto"
        keyboardType="numeric"
        value={monto}
        onChangeText={setMonto}
      />

      <TextInput
        style={styles.input}
        placeholder="Porcentaje comision"
        keyboardType="numeric"
        value={porcentaje}
        onChangeText={setPorcentaje}
      />

      <View style={styles.rubrosContainer}>
        <Text style={styles.rubroLabel}>Rubro</Text>
        <View style={styles.rubrosOpciones}>
          {RUBROS.map((opcionRubro) => (
            <Pressable
              key={opcionRubro}
              style={[
                styles.rubroBoton,
                rubro === opcionRubro && styles.rubroBotonActivo,
              ]}
              onPress={() => setRubro(opcionRubro)}
            >
              <Text
                style={[
                  styles.rubroBotonTexto,
                  rubro === opcionRubro && styles.rubroBotonTextoActivo,
                ]}
              >
                {opcionRubro}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable
        style={styles.boton}
        onPress={operacionEnEdicionId ? guardarCambios : agregarOperacion}
      >
        <Text style={styles.botonTexto}>
          {operacionEnEdicionId ? 'Guardar cambios' : 'Agregar operación'}
        </Text>
      </Pressable>

      {operacionEnEdicionId && (
        <Pressable style={styles.botonCancelar} onPress={cancelarEdicion}>
          <Text style={styles.botonCancelarTexto}>Cancelar edición</Text>
        </Pressable>
      )}

      {rubrosConResumen.length > 0 && (
        <View style={styles.resumenContainer}>
          <Text style={styles.principalTexto}>
            Principal fuente: {rubroPrincipal}
          </Text>
          <Text style={styles.subtitulo}>Resumen por rubro</Text>
          {rubrosConResumen.map(([nombreRubro, totalRubro]) => (
            <Text key={nombreRubro} style={styles.resumenTexto}>
              {nombreRubro}: ${totalRubro.toFixed(2)} (
              {cantidadOperacionesPorRubro[nombreRubro] || 0} operaciones)
            </Text>
          ))}
        </View>
      )}

      <Text style={styles.subtitulo}>Operaciones</Text>

      <View style={styles.filtrosContainer}>
        {FILTROS_RUBRO.map((opcionFiltro) => (
          <Pressable
            key={opcionFiltro}
            style={[
              styles.filtroBoton,
              filtroRubro === opcionFiltro && styles.filtroBotonActivo,
            ]}
            onPress={() => setFiltroRubro(opcionFiltro)}
          >
            <Text
              style={[
                styles.filtroBotonTexto,
                filtroRubro === opcionFiltro && styles.filtroBotonTextoActivo,
              ]}
            >
              {opcionFiltro}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={operacionesFiltradas}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text>No hay operaciones aún</Text>}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>{item.cliente}</Text>
            <Text style={styles.fechaTexto}>
              Fecha: {item.fechaCreacion || 'Sin fecha'}
            </Text>
            <Text>Rubro: {item.rubro || 'Sin rubro'}</Text>
            <Text>${item.monto.toFixed(2)}</Text>
            <Text>{item.porcentaje}%</Text>
            <Text>${item.comision.toFixed(2)}</Text>
            <View
              style={[
                styles.estadoBadge,
                item.estado === 'Cerrada'
                  ? styles.estadoCerrada
                  : styles.estadoEnProceso,
              ]}
            >
              <Text
                style={[
                  styles.estadoBadgeTexto,
                  item.estado === 'Cerrada'
                    ? styles.estadoCerradaTexto
                    : styles.estadoEnProcesoTexto,
                ]}
              >
                {item.estado}
              </Text>
            </View>

            <Pressable
              style={styles.botonEstado}
              onPress={() => cambiarEstadoOperacion(item.id)}
            >
              <Text style={styles.botonEstadoTexto}>Cambiar estado</Text>
            </Pressable>

            <Pressable
              style={styles.botonEditar}
              onPress={() => iniciarEdicion(item)}
            >
              <Text style={styles.botonEditarTexto}>Editar</Text>
            </Pressable>

            <Pressable
              style={styles.botonEliminar}
              onPress={() => eliminarOperacion(item.id)}
            >
              <Text style={styles.botonEliminarTexto}>Eliminar</Text>
            </Pressable>
          </View>
        )}
      />

      <Text style={styles.total}>Total: ${totalComisiones.toFixed(2)}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  metricasContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  tarjetaMetrica: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
  },
  tarjetaGanado: {
    backgroundColor: '#dff7e2',
  },
  tarjetaPotencial: {
    backgroundColor: '#fff1cc',
  },
  etiquetaMetrica: {
    fontSize: 13,
    color: '#555',
    marginBottom: 6,
  },
  valorMetrica: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111',
  },
  titulo: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  subtitulo: { fontSize: 18, marginTop: 10 },
  input: {
    borderWidth: 1,
    marginBottom: 10,
    padding: 10,
    borderRadius: 6,
  },
  rubrosContainer: {
    marginBottom: 10,
  },
  rubroLabel: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  rubrosOpciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rubroBoton: {
    borderWidth: 1,
    borderColor: '#999',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  rubroBotonActivo: {
    backgroundColor: '#111',
    borderColor: '#111',
  },
  rubroBotonTexto: {
    color: '#111',
  },
  rubroBotonTextoActivo: {
    color: '#fff',
    fontWeight: 'bold',
  },
  filtrosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 6,
  },
  filtroBoton: {
    borderWidth: 1,
    borderColor: '#666',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  filtroBotonActivo: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  filtroBotonTexto: {
    color: '#111',
  },
  filtroBotonTextoActivo: {
    color: '#fff',
    fontWeight: 'bold',
  },
  boton: {
    backgroundColor: '#111',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  botonTexto: { color: '#fff' },
  botonCancelar: {
    marginTop: 8,
    backgroundColor: '#757575',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  botonCancelarTexto: {
    color: '#fff',
    fontWeight: 'bold',
  },
  resumenContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  principalTexto: {
    fontWeight: 'bold',
    marginBottom: 6,
  },
  resumenTexto: {
    marginTop: 4,
  },
  item: {
    borderWidth: 1,
    padding: 10,
    marginTop: 5,
    borderRadius: 6,
  },
  fechaTexto: {
    marginTop: 4,
    marginBottom: 4,
    color: '#555',
  },
  estadoBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  estadoBadgeTexto: {
    fontWeight: 'bold',
  },
  estadoCerrada: {
    backgroundColor: '#dff7e2',
  },
  estadoCerradaTexto: {
    color: '#1b5e20',
  },
  estadoEnProceso: {
    backgroundColor: '#fff1cc',
  },
  estadoEnProcesoTexto: {
    color: '#7a4b00',
  },
  botonEstado: {
    marginTop: 8,
    backgroundColor: '#1976d2',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  botonEstadoTexto: {
    color: '#fff',
    fontWeight: 'bold',
  },
  botonEditar: {
    marginTop: 8,
    backgroundColor: '#f57c00',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  botonEditarTexto: {
    color: '#fff',
    fontWeight: 'bold',
  },
  botonEliminar: {
    marginTop: 8,
    backgroundColor: '#d32f2f',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  botonEliminarTexto: {
    color: '#fff',
    fontWeight: 'bold',
  },
  total: { marginTop: 10, fontWeight: 'bold' },
});
