import { useEffect, useState } from 'react';
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

export default function App() {
  const [cliente, setCliente] = useState('');
  const [monto, setMonto] = useState('');
  const [porcentaje, setPorcentaje] = useState('');
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
      estado: 'En proceso',
    };

    setOperaciones((prev) => [nuevaOperacion, ...prev]);
    limpiarFormulario();
  };

  const iniciarEdicion = (operacion) => {
    setCliente(operacion.cliente);
    setMonto(operacion.monto.toString());
    setPorcentaje(operacion.porcentaje.toString());
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

  const totalGanado = operaciones
    .filter((operacion) => operacion.estado === 'Cerrada')
    .reduce((total, operacion) => total + operacion.comision, 0);

  const totalPotencial = operaciones
    .filter((operacion) => operacion.estado === 'En proceso')
    .reduce((total, operacion) => total + operacion.comision, 0);

  return (
    <SafeAreaView style={styles.container}>
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

      <Text style={styles.subtitulo}>Operaciones</Text>

      <FlatList
        data={operaciones}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text>No hay operaciones aún</Text>}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>{item.cliente}</Text>
            <Text>${item.monto.toFixed(2)}</Text>
            <Text>{item.porcentaje}%</Text>
            <Text>${item.comision.toFixed(2)}</Text>
            <Text>Estado: {item.estado}</Text>

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
      <Text style={styles.total}>Total ganado: ${totalGanado.toFixed(2)}</Text>
      <Text style={styles.total}>
        Total potencial: ${totalPotencial.toFixed(2)}
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  titulo: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },
  subtitulo: { fontSize: 18, marginTop: 10 },
  input: {
    borderWidth: 1,
    marginBottom: 10,
    padding: 10,
    borderRadius: 6,
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
  item: {
    borderWidth: 1,
    padding: 10,
    marginTop: 5,
    borderRadius: 6,
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
