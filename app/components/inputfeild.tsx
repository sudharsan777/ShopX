import React from 'react';
import { StyleSheet, View, TextInput, TextInputProps } from 'react-native';
import { Colors } from '@/constants/Colors';


type inputdeildprops = TextInputProps;

const Inputfeild = (props: inputdeildprops) => {
    return (
        <TextInput {...props} style={styles.inputfield} />
    );
}

const styles = StyleSheet.create({

    inputfield: {
        backgroundColor: Colors.white,
        paddingVertical: 12,
        paddingHorizontal: 18,
        alignSelf: 'stretch',
        borderRadius: 5,
        marginVertical: 6
    }

})

export default Inputfeild;
