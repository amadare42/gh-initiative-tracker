import './styles.scss'
import { useAppDispatch, useAppSelector } from '../../store';
import classNames from 'classnames';
import { initiativeSliceActions } from '../../store/initiativeSlice';
import { useCallback, useEffect } from 'react';
import { useLocalize } from '../../localisation';

interface Props {
    actorId: number;
    close: () => void;
}

const avatars = [
    'black-imp.png',
    'black-sludge.png',
    'blood-imp.png',
    'blood-monstrosity.png',
    'chaos-demon.png',
    'giant-viper.png',
    'demolitionist.png',
    'hatchet.png',
    'red-guard.png',
    'voidwarden.png',
    'living-corpse.png',
    'living-spirit.png',
    'rat-monstrosity.png',
    'stone-golem.png',
    'vermling-raider.png',
    'vermling-scout.png',
    'zealot.png',
]

export function usePrefetchImages() {
    useEffect(() => {
        avatars.forEach(avatar => {
            const img = new Image();
            img.src = `/avatars/${ avatar }`;
        })
    })
}

export function SelectAvatarList({ actorId, close }: Props) {
    const actor = useAppSelector(state => state.initiative.characters.find(c => c.id === actorId));
    const dispatch = useAppDispatch();
    const setAvatar = useCallback((avatar: string) => {
        const isDefaultName = actor.name === 'New Character' || actor.name === 'Enemy';
        if (isDefaultName && avatar) {
            dispatch(initiativeSliceActions.changeActorName({
                id: actorId,
                name: fileNameToName(avatar)
            }));
        }
        return dispatch(initiativeSliceActions.setActorAvatar({
            id: actorId,
            avatar
        }));
    }, [dispatch, actorId]);
    const t = useLocalize();

    return <div
        className={ classNames('SelectAvatarList-wrapper', {
            enemy: actor.isEnemy,
            character: !actor.isEnemy
        }) }
        onClick={ close }>
        { avatars.map(avatar => <div
            className={ 'SelectAvatarList-item' }
            key={ avatar }
            onClick={ () => setAvatar(avatar) }
            style={ { '--url': `url(/avatars/${ avatar })` } as any }
        >
            { t(fileNameToName(avatar)) }
        </div>) }
        <div className={ 'SelectAvatarList-item empty' } onClick={() => setAvatar(null)}>{t('Empty')}</div>
    </div>
}

function fileNameToName(fileName: string) {
    const lowerCase = fileName.replace('.png', '').replace(/-/g, ' ');
    // capitalize all words
    return lowerCase.replace(/(?:^|\s)\S/g, function (a) {
        return a.toUpperCase();
    });
}
