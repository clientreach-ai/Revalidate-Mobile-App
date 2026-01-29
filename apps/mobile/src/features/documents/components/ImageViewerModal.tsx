import React from 'react';
import { Modal, View, Image, Pressable, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ImageViewerModalProps {
    isVisible: boolean;
    imageUrl: string | null;
    onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ isVisible, imageUrl, onClose }) => {
    const [loading, setLoading] = React.useState(true);

    return (
        <Modal
            visible={isVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <Pressable style={styles.closeButton} onPress={onClose}>
                    <MaterialIcons name="close" size={30} color="white" />
                </Pressable>

                {imageUrl && (
                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: imageUrl }}
                            style={styles.image}
                            resizeMode="contain"
                            onLoadStart={() => setLoading(true)}
                            onLoadEnd={() => setLoading(false)}
                        />
                        {loading && (
                            <ActivityIndicator size="large" color="white" style={styles.loader} />
                        )}
                    </View>
                )}
            </View>
        </Modal>
    );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
    imageContainer: {
        width: width,
        height: height,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: width,
        height: height,
    },
    loader: {
        position: 'absolute',
    }
});
